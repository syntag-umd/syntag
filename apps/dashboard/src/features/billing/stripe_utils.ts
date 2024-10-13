/**Takes a customer balance, and displays it for their pov */
export function toDisplayCredit(balance: number) {
    return (-balance / 100).toFixed(2);
  }
  