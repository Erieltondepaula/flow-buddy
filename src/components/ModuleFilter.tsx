import { ECOSYSTEM_MODULES } from "@/lib/modules";

interface ModuleFilterProps {
  selected: string;
  onChange: (module: string) => void;
  showAll?: boolean;
}

const ModuleFilter = ({ selected, onChange, showAll = true }: ModuleFilterProps) => {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {showAll && (
        <button
          onClick={() => onChange("Todos")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selected === "Todos" ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
          }`}
        >
          Todos
        </button>
      )}
      {ECOSYSTEM_MODULES.map((mod) => (
        <button
          key={mod}
          onClick={() => onChange(mod)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selected === mod ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
          }`}
        >
          {mod}
        </button>
      ))}
    </div>
  );
};

export default ModuleFilter;
