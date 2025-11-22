import PopupSheet from "../ui/popup-sheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type ActionSelectionModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreateRoute?: () => void;
  onCreateInvoice?: () => void;
};

const ActionSelectionModal = ({
  visible,
  onClose,
  onCreateRoute,
  onCreateInvoice,
}: ActionSelectionModalProps) => {
  const handleCreateRoute = () => {
    onCreateRoute?.();
    // onClose() is now handled by PopupSheet automatically
  };

  const handleCreateInvoice = () => {
    onCreateInvoice?.();
    // onClose() is now handled by PopupSheet automatically
  };

  return (
    <PopupSheet visible={visible} onClose={onClose} title="Quick Actions">
      <PopupSheet.Item
        icon={MaterialCommunityIcons}
        iconName="archive"
         title="Create Route"
         description="Create a new route"
        onPress={handleCreateRoute}
      />
      <PopupSheet.Item
        icon={MaterialCommunityIcons}
        iconName="file-document"
        title="Create Invoice"
        description="Generate a new invoice"
        onPress={handleCreateInvoice}
      />
    </PopupSheet>
  );
};

export default ActionSelectionModal;
