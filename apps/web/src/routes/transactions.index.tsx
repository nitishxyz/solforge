import { createFileRoute } from "@tanstack/react-router";
import { TransactionsPage } from "../components/TransactionsPage";

export const Route = createFileRoute("/transactions/")({
	component: TransactionsPage,
});
