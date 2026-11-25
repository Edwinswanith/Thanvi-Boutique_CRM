import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TestOrderInvoice } from "@/components/invoice/TestOrderInvoice";
import { connectDb } from "@/lib/db";
import { Order } from "@/models/Order";
import { canOpenTestInvoice } from "@/server/services/shopCheckout";

export const metadata: Metadata = { title: "Test invoice", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ShopOrderInvoice({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string | string[] }> }) {
  const { id } = await params;
  const { token } = await searchParams;
  if (typeof token !== "string" || !canOpenTestInvoice(id, token)) notFound();
  await connectDb();
  const order = await Order.findOne({ _id: id, test: true }).lean();
  if (!order?.breakdown) notFound();
  return <TestOrderInvoice order={order} quote={order.breakdown} />;
}
