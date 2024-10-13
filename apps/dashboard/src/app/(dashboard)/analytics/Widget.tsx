
interface WidgetProps {
    title: string;
    description: string;
    value: string;
    units?: string;
    isLoading?: boolean;
}

const Widget = ({title, description, value, units, isLoading }: WidgetProps) => {

    return (
        <div className="flex flex-col text-left font-medium bg-card p-3 rounded-xl w-48 aspect-square">
            <div className="leading-tight text-xl">{title}</div>
            <div className="text-sm text-gray-300">{description}</div>
            <div className="m-3 text-center text-7xl font-bold">{value}</div>
            <div>in {units}</div>
        </div>
    );
}

export default Widget;
