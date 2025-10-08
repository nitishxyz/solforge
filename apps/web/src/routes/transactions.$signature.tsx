import { createFileRoute } from "@tanstack/react-router";
import { TransactionDetailsPage } from "../components/TransactionDetailsPage";

export const Route = createFileRoute("/transactions/$signature")({
	component: TransactionDetailsPage,
});
