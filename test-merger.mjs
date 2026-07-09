import { parseDSL } from './lib/dsl/parser.js';
import { transformAST } from './lib/dsl/transformer.js';
import { mergeDSL } from './lib/dsl/merger.js';

const currentState = {
	nodes: [
		{ id: '1', type: 'start-end', position: { x: 100, y: 100 }, label: 'Start' },
		{ id: '2', type: 'process', position: { x: 100, y: 200 }, label: 'Process Check' },
		{ id: '3', type: 'decision', position: { x: 100, y: 300 }, label: 'Is Valid?' },
		{ id: '4', type: 'start-end', position: { x: 100, y: 500 }, label: 'End' }
	],
	edges: [
		{ id: 'e1', source: '1', target: '2' },
		{ id: 'e2', source: '2', target: '3' }
	]
};

const dslText = `
start "Mulai Belanja"
actor "Pelanggan"
io "Aplikasi Mobile / Web"
process "API Gateway Layer"
process "Auth Service (JWT)"
database "Redis Cache (Sessions)"
process "Order Service"
process "User Service"
database "PostgreSQL (Users)"
process "Inventory Service"
database "PostgreSQL (Inventory)"
decision "Stock Tersedia?"
end "Pesanan Dibatalkan"
process "Payment Gateway"
io "Stripe / PayPal (External)"
decision "Pembayaran Sukses?"
process "Kafka Event Bus"
process "Shipping Service"
process "Print Shipping Label"
actor "Kurir Logistik"
end "Pesanan Selesai"
database "MongoDB (Orders)"

"Mulai Belanja" -> "Pelanggan"
"Pelanggan" <-> "Aplikasi Mobile / Web" : HTTPS (UI)
"Aplikasi Mobile / Web" -> "API Gateway Layer" : REST API
"API Gateway Layer" -> "Auth Service (JWT)" : Validasi Token
"Auth Service (JWT)" <-> "Redis Cache (Sessions)" : Cek Sesi
"API Gateway Layer" -> "Order Service" : POST /api/orders
"Order Service" -> "User Service" : Get Profile
"User Service" <-> "PostgreSQL (Users)"
"Order Service" -> "Inventory Service" : Pesan Barang
"Inventory Service" <-> "PostgreSQL (Inventory)"
"Inventory Service" -..-> "Stock Tersedia?" : Validasi
"Stock Tersedia?" --Tidak--> "Pesanan Dibatalkan"
"Stock Tersedia?" --Ya--> "Payment Gateway"
"Payment Gateway" <-> "Stripe / PayPal (External)" : Secure TCP
"Stripe / PayPal (External)" -..-> "Pembayaran Sukses?" : Webhook
"Pembayaran Sukses?" --Gagal--> "Pesanan Dibatalkan"
"Pembayaran Sukses?" --Berhasil--> "Kafka Event Bus" : Publish Event
"Kafka Event Bus" -> "Order Service" : Event: Order_Paid
"Order Service" -> "MongoDB (Orders)" : Simpan Status "Lunas"
"Kafka Event Bus" -> "Shipping Service" : Event: Ready_To_Ship
"Shipping Service" -> "Print Shipping Label" : Generate PDF
"Shipping Service" -> "Kurir Logistik" : Request Pickup
"Kurir Logistik" -> "Pesanan Selesai" : Barang Diterima
`;

const ast = parseDSL(dslText);
const freshIR = transformAST(ast);
console.log('freshIR edges count:', freshIR.edges.length);
console.log('freshIR edge IDs:', freshIR.edges.map(e => e.id).join(', '));

const result = mergeDSL(dslText, currentState);
console.log('merged edges count:', result.edges.length);
console.log('merged edge IDs:', result.edges.map(e => e.id).join(', '));

