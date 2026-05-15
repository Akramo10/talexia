from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import io
import pandas as pd
from fpdf import FPDF
from datetime import datetime
import urllib.parse

from app.database import get_db
from app.core.deps import get_current_user
from app.models.application import Application
from app.models.user import User

router = APIRouter(prefix="/export", tags=["export"])

def _format_date(dt):
    if not dt:
        return "Non spécifiée"
    return dt.strftime("%Y-%m-%d %H:%M")

@router.get("/{format_type}")
async def export_data(format_type: str = Path(..., description="Le format d'export: 'excel' ou 'pdf'"), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if format_type not in ["excel", "pdf"]:
        raise HTTPException(status_code=400, detail="Format non supporté. Utilisez 'excel' ou 'pdf'.")
        
    # Get all applications with their company relationships, sorted by last_contact_date descending
    query = select(Application).options(selectinload(Application.company)).where(Application.user_id == current_user.id).order_by(Application.last_contact_date.desc())
    result = await db.execute(query)
    applications = result.scalars().all()
    
    # Clean and structure data for export
    export_data = []
    for app in applications:
        export_data.append({
            "Entreprise": app.company.name if app.company else "Inconnue",
            "Poste": app.job_url.split('/')[-1] if app.job_url and not "indeed" in app.job_url else "Offre", # simplifier si besoin
            "Statut": app.status.value,
            "Type": app.type.value,
            "Date d'envoi": _format_date(app.date_sent),
            "Dernière Activité": _format_date(app.last_contact_date),
            "Localisation": app.location or "Non spécifiée",
            "Lien de l'offre": app.job_url or "Aucun",
            "Prioritaire": "Oui" if app.is_flagged else "Non"
        })
        
    # Generate timestamp for filename
    timestamp = datetime.now().strftime("%Y-%m-%d")
    
    if format_type == "excel":
        df = pd.DataFrame(export_data)
        
        # Create an in-memory bytes buffer
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Candidatures')
            # Auto-adjust column widths
            worksheet = writer.sheets['Candidatures']
            for col in worksheet.columns:
                max_length = 0
                column = col[0].column_letter # Get the column name
                for cell in col:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = (max_length + 2)
                worksheet.column_dimensions[column].width = min(adjusted_width, 50)
        
        output.seek(0)
        
        filename = f"NEXUS_Export_{timestamp}.xlsx"
        headers = {
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
        
        return StreamingResponse(
            output, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers
        )
        
    elif format_type == "pdf":
        class PDF(FPDF):
            def header(self):
                self.set_font("helvetica", "B", 15)
                # Colors for header
                self.set_text_color(51, 65, 85) # slate-700
                self.cell(0, 10, "NEXUS - Bilan des Candidatures", border=False, align="C", new_x="LMARGIN", new_y="NEXT")
                self.set_font("helvetica", "I", 10)
                self.set_text_color(100, 116, 139) # slate-500
                self.cell(0, 10, f"Généré le {timestamp}", border=False, align="C", new_x="LMARGIN", new_y="NEXT")
                self.ln(5)
                
            def footer(self):
                self.set_y(-15)
                self.set_font("helvetica", "I", 8)
                self.set_text_color(148, 163, 184) # slate-400
                self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

        pdf = PDF(orientation="L", unit="mm", format="A4")
        pdf.add_page()
        pdf.set_font("helvetica", size=9)
        
        # Table configuration
        col_widths = [45, 45, 30, 25, 35, 35, 45] # Total: 260mm (A4 Landscape is 297mm width, so margins fit well)
        headers_pdf = ["Entreprise", "Lien/Poste", "Statut", "Type", "Date d'envoi", "Dernière Activité", "Localisation"]
        
        # Header row
        pdf.set_fill_color(241, 245, 249) # slate-100
        pdf.set_font("helvetica", "B", 9)
        pdf.set_text_color(15, 23, 42) # slate-900
        
        for i, header in enumerate(headers_pdf):
            pdf.cell(col_widths[i], 10, header, border=1, align="C", fill=True)
        pdf.ln()
        
        # Data rows
        pdf.set_font("helvetica", size=8)
        pdf.set_text_color(51, 65, 85) # slate-700
        
        for app in export_data:
            # Prepare row data, truncating to avoid overflowing cells
            row = [
                str(app["Entreprise"])[:30],
                str(app["Lien de l'offre"])[:30] + "..." if len(str(app["Lien de l'offre"])) > 30 else str(app["Lien de l'offre"]),
                str(app["Statut"]),
                str(app["Type"]),
                str(app["Date d'envoi"]),
                str(app["Dernière Activité"]),
                str(app["Localisation"])[:30]
            ]
            
            # Check if page break is needed
            if pdf.get_y() > 180:
                pdf.add_page()
                # Redraw header
                pdf.set_fill_color(241, 245, 249)
                pdf.set_font("helvetica", "B", 9)
                pdf.set_text_color(15, 23, 42)
                for i, header in enumerate(headers_pdf):
                    pdf.cell(col_widths[i], 10, header, border=1, align="C", fill=True)
                pdf.ln()
                pdf.set_font("helvetica", size=8)
                pdf.set_text_color(51, 65, 85)
                
            for i, text in enumerate(row):
                pdf.cell(col_widths[i], 8, text, border=1, align="L")
            pdf.ln()
            
        output = io.BytesIO()
        pdf.output(output)
        output.seek(0)
        
        filename = f"NEXUS_Export_{timestamp}.pdf"
        # URL encode the filename to prevent header parsing errors
        encoded_filename = urllib.parse.quote(filename)
        headers = {
            'Content-Disposition': f"attachment; filename*=utf-8''{encoded_filename}"
        }
        
        return StreamingResponse(
            output,
            media_type="application/pdf",
            headers=headers
        )
