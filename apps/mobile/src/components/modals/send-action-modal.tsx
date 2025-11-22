import PopupSheet from "../ui/popup-sheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type SendActionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSendToWallet?: () => void;
  onSendToBank?: () => void;
};

const SendActionModal = ({
  visible,
  onClose,
  onSendToWallet,
  onSendToBank,
}: SendActionModalProps) => {
  const handleSendToWallet = () => {
    onSendToWallet?.();
  };

  const handleSendToBank = () => {
    onSendToBank?.();
  };

  return (
    <PopupSheet visible={visible} onClose={onClose} title="Send Money">
      <PopupSheet.Item
        icon={MaterialCommunityIcons}
        iconName="wallet"
        title="To Wallet"
        description="Send USDC to crypto wallet"
        onPress={handleSendToWallet}
      />
      <PopupSheet.Item
        icon={MaterialCommunityIcons}
        iconName="bank"
        title="To Bank Account"
        description="Send USDC to a bank account"
        onPress={handleSendToBank}
      />
    </PopupSheet>
  );
};

export default SendActionModal;
