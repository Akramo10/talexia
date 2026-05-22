
import resend
import os

resend.api_key = os.getenv("RESEND_API_KEY")

params = {
    "from": "Telxia RH <rh@telxia.fr>",
    "to": ["esrae.ben-selma@etu.eilco.univ-littoral.fr"],
    "subject": "Confirmation d’acceptation - Alternance Telxia",
    "html": """
    <div style="margin:0;padding:0;background:#C2D1D5;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:680px;margin:0 auto;padding:35px 20px;">
        <div style="background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #8BA5AD;">

          <!-- HEADER -->
          <div style="background:#344D5C;padding:32px 28px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:26px;">
              Confirmation d’acceptation
            </h1>

            <p style="color:#C2D1D5;margin:10px 0 0;font-size:16px;">
              Alternance — Telxia
            </p>
          </div>

          <!-- BODY -->
          <div style="padding:34px 30px;color:#344D5C;font-size:16px;line-height:1.7;">

            <p>Bonjour Esrae Ben Selma,</p>

            <p>
              Nous avons le plaisir de vous informer que votre candidature
              pour une alternance au sein de <strong>Telxia</strong>
              a été retenue.
            </p>

            <p>
              Votre profil et vos compétences ont particulièrement retenu
              notre attention et nous serons ravis de vous accueillir
              prochainement au sein de notre équipe.
            </p>

            <div style="
                margin:28px 0;
                padding:20px;
                border-radius:14px;
                background:#F5F8F9;
                border-left:5px solid #4B8491;
            ">
              <p style="margin:0 0 8px;">
                <strong>Statut :</strong> Candidature acceptée
              </p>

              <p style="margin:0 0 8px;">
                <strong>Entreprise :</strong> Telxia
              </p>

              <p style="margin:0;">
                <strong>Type :</strong> Alternance
              </p>
            </div>

            <p>
              Nous reviendrons vers vous prochainement concernant
              les prochaines étapes administratives et organisationnelles.
            </p>

            <p>
              Pour plus de détails, veuillez appeler le :
              <strong>+33 7 59 00 91 45</strong>
            </p>

            <p>
              Félicitations et bienvenue chez Telxia.
            </p>

            <p>
              Cordialement,<br>
              <strong>Service RH Telxia</strong><br>
              rh@telxia.fr
            </p>

          </div>

          <!-- FOOTER -->
          <div style="
              background:#344D5C;
              color:#C2D1D5;
              text-align:center;
              padding:16px;
              font-size:13px;
          ">
            Telxia - Talexia
          </div>

        </div>
      </div>
    </div>
    """,

    "text": """
Bonjour Esrae Ben Selma,

Nous avons le plaisir de vous informer que votre candidature
pour une alternance au sein de Telxia a été retenue.

Votre profil et vos compétences ont particulièrement retenu
notre attention et nous serons ravis de vous accueillir
prochainement au sein de notre équipe.

Statut : Candidature acceptée
Entreprise : Telxia
Type : Alternance

Nous reviendrons vers vous prochainement concernant
les prochaines étapes administratives et organisationnelles.

Pour plus de détails, veuillez appeler le :
+33 7 59 00 91 45

Félicitations et bienvenue chez Telxia.

Cordialement,
Service RH Telxia
rh@telxia.fr
    """
}

email = resend.Emails.send(params)
print(email)

