import { Search } from 'lucide-react';

interface TechFilterProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
}

export function TechFilter({ searchTerm, onSearchChange }: TechFilterProps) {
    return (
        <div className="flex items-center w-full md:w-[400px] bg-slate-950 border border-slate-800 rounded-xl focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all shadow-sm">
            <div className="relative flex-1 flex items-center">
                <Search className="w-4 h-4 text-slate-500 absolute left-4" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Rechercher une entreprise, techno..."
                    className="w-full bg-transparent border-none text-slate-200 pl-11 pr-4 py-3 text-sm focus:outline-none placeholder-slate-600 font-medium"
                />
            </div>
            {/* 
            <div className="border-l border-slate-800 pl-4 pr-4 py-2 flex items-center cursor-pointer hover:text-brand-400 transition-colors text-slate-500 group">
                <Filter className="w-4 h-4 mr-2 group-hover:text-brand-400" />
                <span className="text-xs font-bold uppercase tracking-widest">Filtres</span>
            </div> 
            */}
        </div>
    );
}
