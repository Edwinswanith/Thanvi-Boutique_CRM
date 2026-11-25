import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { formatINR } from "@/lib/money";
import { Order } from "@/models/Order";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { locationFilter } from "@/server/scope";
import { myLocations } from "@/server/services/myLocations";
import { CancelOrderButton } from "./CancelOrderButton";

export const metadata: Metadata = { title: "Online orders" };

export default async function OnlineOrdersPage() {
  const { actor, allowed } = await pageActor("orders.view");
  if (!allowed || !(await myLocations(actor, ["online"])).length) return <Forbidden />;
  const orders = await Order.find(locationFilter(actor)).sort({ createdAt: -1 }).limit(100).lean();

  return (
    <>
      <PageHeader title="Orders" description="Review website test orders, payments and linked invoices." />
      <div className="panel overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line">
            <tr>{["Order", "Customer", "Items", "Payment", "Total", "Status"].map((label) => <th key={label} scope="col" className="px-4 py-3">{label}</th>)}</tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <p className="code">{order.number}</p>
                  <p className="text-ink-soft">{order.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
                  {order.breakdown?.total !== undefined && <Link href={`/admin/orders/${order._id}/invoice`} className="underline">Test invoice</Link>}
                </td>
                <td className="px-4 py-3">{order.customer?.name ?? "—"}</td>
                <td className="px-4 py-3">{order.lines.map((line) => <p key={line.slug}>{line.title} × {line.quantity}</p>)}</td>
                <td className="px-4 py-3">{order.paymentStatus === "test_paid" ? "Dummy payment recorded" : order.status === "cancelled" ? "Cash on delivery cancelled" : "Cash on delivery pending"}</td>
                <td className="px-4 py-3">{formatINR(order.total)}</td>
                <td className="px-4 py-3">
                  <p className="capitalize">{order.status}</p>
                  {order.test && order.status === "confirmed" && can(actor, "orders.edit") && <CancelOrderButton id={order._id} />}
                </td>
              </tr>
            ))}
            {!orders.length && <tr><td colSpan={6} className="px-4 py-8 text-center">No online orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
