
type Props = {
    icon: React.ReactNode;
};

const IconButton = ({ icon }:Props) => (
    <div className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 cursor-pointer text-gray-700 transition">
        {icon}
    </div>
);

export default IconButton