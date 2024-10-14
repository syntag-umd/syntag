import { ScaleFade, Text } from "@chakra-ui/react";
import ResolutionForm from "./ResolutionForm";

interface ModalProps {
  open: boolean;
  onClose: () => void;
}

function ResolutionModal({ open, onClose }: Readonly<ModalProps>) {
  if (!open) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-gray-500 opacity-10"
        onClick={onClose}
      ></div>
      <ScaleFade initialScale={0.7} in={open}>
        <div className="top-1/2 z-10 mt-[115%] -translate-y-1/2 rounded-xl bg-white p-8 shadow-lg transition duration-300 ease-in-out">
          <Text className="text-md font-semibold">
            Thanks for talking with us
          </Text>
          <Text className="text-xs font-medium">
            Do you have any questions or comments?
          </Text>
          <div className="mt-4">
            <ResolutionForm onClose={onClose} />
          </div>
          {/* Add user option to not see again */}
        </div>
      </ScaleFade>
    </div>
  );
}

export default ResolutionModal;
