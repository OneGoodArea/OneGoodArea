interface WorkflowCardProps {
  title: string;
  description: string;
  className?: string;
  children: React.ReactNode;
}

export function WorkflowCard({ title, description, className, children }: WorkflowCardProps) {
  return (
    <div className={`rounded-lg border border-[#1c1c22] bg-[#0f0f12] p-6 ${className ?? ""}`}>
      <h3 className="text-lg font-semibold text-[#e4e4e8] mb-2">{title}</h3>
      <p className="text-sm text-[#8a8a96] mb-4">{description}</p>
      {children}
    </div>
  );
}