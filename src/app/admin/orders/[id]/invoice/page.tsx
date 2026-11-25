import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Forbidden } from "@/components/admin/PageHeader";
import { TestOrderInvoice } from "@/components/invoice/TestOrderInvoice";
import { Order } from "@/models/Order";
import { pageActor } from "@/server/page";
import { locationFilter } from "@/server/scope";

export const metadata: Metadata = { title: "Website test invoice" };

export default async function AdminOrderInvoice({ params }: { params: Promise<{ id: string }> }) {
  const { actor, allowed } = await pageActor("orders.view");
  if (!allowed) return <Forbidden />;
  const { id } = await params;
  const order = await Order.findOne({ _id: id, test: true, ...locationFilter(actor) }).lean();
  if (!order?.breakdown) notFound();
  return <TestOrderInvoice order={order} quote={order.breakdown} />;
}
