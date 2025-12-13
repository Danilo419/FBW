import OrderDetailsClient from './OrderDetailsClient';

export default function OrderDetailsPage({ params }: { params: { orderId: string } }) {
  return <OrderDetailsClient orderId={params.orderId} />;
}
