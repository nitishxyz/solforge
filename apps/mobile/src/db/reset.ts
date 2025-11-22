import db from "./index";
import { users } from "./schema/users";
import { sessions } from "./schema/sessions";
import { messages } from "./schema/messages";
import { transactions } from "./schema/transactions";

export async function resetDatabase() {
    await db.delete(messages);
    await db.delete(sessions);
    await db.delete(transactions);
    await db.delete(users);
}
