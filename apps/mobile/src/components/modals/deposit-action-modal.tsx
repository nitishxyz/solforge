import PopupSheet from "@/ui/popup-sheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type DepositActionModalProps = {
  visible: boolean;
  onClose: () => void;
  onDepositFromWallet?: () => void;
  onDepositFromBank?: () => void;
};

const DepositActionModal = ({
  visible,
  onClose,
  onDepositFromWallet,
  onDepositFromBank,
}: DepositActionModalProps) => {
  const handleDepositFromWallet = () => {
    onDepositFromWallet?.();
  };

  const handleDepositFromBank = () => {
    onDepositFromBank?.();
  };

  return (
    <PopupSheet visible={visible} onClose={onClose} title="Add Money">
      <PopupSheet.Item
        icon={MaterialCommunityIcons}
        iconName="wallet-plus"
        title="From Wallet"
        description="Deposit USDC from crypto wallet"
        onPress={handleDepositFromWallet}
      />
      <PopupSheet.Item
        icon={MaterialCommunityIcons}
        iconName="bank-plus"
        title="From Bank Account"
        description="Deposit USD from bank"
        onPress={handleDepositFromBank}
      />
    </PopupSheet>
  );
};

export default DepositActionModal;
