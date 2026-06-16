import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";

export default function Cocina() {
  const [pedidos, setPedidos] = useState([]);
  const [listo, setListo] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    cargarPedidos();
    // Consultar cada 3 segundos
    intervalRef.current = setInterval(() => cargarPedidos(), 3000);
    return () => clearInterval(intervalRef.current);
  }, []);

  async function cargarPedidos() {
    const { data, error } = await supabase
      .from("pedidos")
      .select(
        `
        id,
        numero_mesa,
        estado,
        created_at,
        pedido_items (
          id,
          con_sopa,
          menu_dia (
            platos ( nombre )
          )
        )
      `,
      )
      .eq("estado", "pendiente")
      .order("created_at", { ascending: true });

    if (error) return;

    // Filtrar pedidos que tengan items válidos
    const validos = (data || []).filter((p) =>
      p.pedido_items.every((i) => i.menu_dia?.platos?.nombre),
    );

    setPedidos(validos);
    setListo(true);
  }

  async function marcarEntregado(id) {
    setPedidos((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("pedidos").update({ estado: "entregado" }).eq("id", id);
  }

  function tiempoTranscurrido(fecha) {
    const diff = Math.floor((new Date() - new Date(fecha)) / 1000 / 60);
    if (diff < 1) return "Ahora mismo";
    if (diff === 1) return "Hace 1 min";
    return `Hace ${diff} min`;
  }

  if (!listo) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400 text-lg">Conectando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white text-2xl font-bold">🍳 Cocina</h1>
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            pedidos.length > 0
              ? "bg-orange-500 text-white"
              : "bg-gray-700 text-gray-400"
          }`}
        >
          {pedidos.length} pendiente{pedidos.length !== 1 ? "s" : ""}
        </span>
      </div>

      {pedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-5xl mb-4">✅</p>
          <p className="text-gray-400 text-lg">Sin pedidos pendientes</p>
          <p className="text-gray-600 text-sm mt-1">
            Actualizando cada 3 segundos...
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-w-md mx-auto">
          {pedidos.map((pedido) => (
            <div
              key={pedido.id}
              className="bg-gray-800 rounded-2xl p-4 border border-gray-700"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="bg-orange-500 text-white font-bold px-3 py-1 rounded-xl text-lg">
                  Mesa {pedido.numero_mesa}
                </span>
                <span className="text-gray-400 text-sm">
                  {tiempoTranscurrido(pedido.created_at)}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {pedido.pedido_items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center bg-gray-700 rounded-xl px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm font-bold">
                        {index + 1}.
                      </span>
                      <span className="text-white font-semibold">
                        {item.menu_dia.platos.nombre}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                        item.con_sopa
                          ? "bg-green-900 text-green-400"
                          : "bg-gray-600 text-gray-300"
                      }`}
                    >
                      {item.con_sopa ? "🍲 Con sopa" : "Sin sopa"}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => marcarEntregado(pedido.id)}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-xl transition"
              >
                ✓ Marcar como entregado
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
