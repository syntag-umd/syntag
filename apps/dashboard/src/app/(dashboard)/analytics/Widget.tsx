interface WidgetProps {
  title: string;
  description: string;
  value: string;
  units?: string;
  isLoading?: boolean;
}

const Widget = ({
  title,
  description,
  value,
  units,
  isLoading,
}: WidgetProps) => {
  return (
    <div className="flex aspect-square w-48 flex-col rounded-xl bg-card p-3 text-left font-medium">
      <div className="text-xl leading-tight">{title}</div>
      <div className="text-sm text-gray-300">{description}</div>
      <div className="m-3 text-center text-7xl font-bold">{value}</div>
      <div>in {units}</div>
    </div>
  );
};

export default Widget;
