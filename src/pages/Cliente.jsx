import { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function Cliente() {
  const [menuHoy, setMenuHoy] = useState([]);
  const [sopaDelDia, setSopaDelDia] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [mesa, setMesa] = useState("");
  const [paso, setPaso] = useState("menu"); // menu | carrito | confirmacion
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const hoy = new Date().toISOString().split("T")[0];

  useEffect(() => {
    cargarMenu();
  }, []);

  async function cargarMenu() {
    setCargando(true);
    const { data, error } = await supabase
      .from("menu_dia")
      .select(
        `
    id,
    precio,
    cantidad_disponible,
    platos ( id, nombre, descripcion, foto_url ),
    sopas ( nombre )
  `,
      )
      .eq("fecha", hoy)
      .gt("cantidad_disponible", 0);

    if (!error && data.length > 0) {
      setMenuHoy(data);
      setSopaDelDia(data[0].sopas.nombre);
    }
    setCargando(false);
  }

  function agregarAlCarrito(item) {
    setCarrito((prev) => [
      ...prev,
      {
        menu_dia_id: item.id,
        nombre: item.platos.nombre,
        precio: item.precio,
        con_sopa: true, // por defecto con sopa
      },
    ]);
  }

  function toggleSopa(index) {
    setCarrito((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, con_sopa: !item.con_sopa } : item,
      ),
    );
  }

  function eliminarDelCarrito(index) {
    setCarrito((prev) => prev.filter((_, i) => i !== index));
  }

  async function enviarPedido() {
    // Validar que el carrito no esté vacío
    if (carrito.length === 0) {
      setMensaje("❌ No has seleccionado ningún plato");
      setTimeout(() => setMensaje(""), 3000);
      return;
    }

    if (!mesa.trim()) {
      setMensaje("❌ Escribe el número de mesa");
      setTimeout(() => setMensaje(""), 3000);
      return;
    }

    setEnviando(true);

    // Verificar stock en tiempo real antes de insertar
    const ids = [...new Set(carrito.map((i) => i.menu_dia_id))];
    const { data: stockActual } = await supabase
      .from("menu_dia")
      .select("id, cantidad_disponible, platos(nombre)")
      .in("id", ids);

    // Contar cuántas veces se pide cada plato en el carrito
    const conteo = {};
    carrito.forEach((item) => {
      conteo[item.menu_dia_id] = (conteo[item.menu_dia_id] || 0) + 1;
    });

    // Verificar si alguno se agotó
    const agotados = stockActual.filter(
      (s) => s.cantidad_disponible < conteo[s.id],
    );
    if (agotados.length > 0) {
      const nombres = agotados.map((a) => a.platos.nombre).join(", ");
      setMensaje(`❌ Se agotó: ${nombres}. Por favor retíralo del carrito.`);
      // Refrescar el menú para mostrar el estado real
      cargarMenu();
      setEnviando(false);
      setTimeout(() => setMensaje(""), 6000);
      return;
    }

    // Crear el pedido
    const { data: pedido, error: errorPedido } = await supabase
      .from("pedidos")
      .insert({ numero_mesa: mesa.trim() })
      .select()
      .single();

    if (errorPedido) {
      setMensaje("❌ Error al enviar el pedido");
      setEnviando(false);
      return;
    }

    // Insertar los items del pedido
    const items = carrito.map((item) => ({
      pedido_id: pedido.id,
      menu_dia_id: item.menu_dia_id,
      con_sopa: item.con_sopa,
    }));

    await supabase.from("pedido_items").insert(items);

    // Descontar el stock
    for (const item of stockActual) {
      await supabase
        .from("menu_dia")
        .update({
          cantidad_disponible: item.cantidad_disponible - conteo[item.id],
        })
        .eq("id", item.id);
    }

    setPaso("confirmacion");
    setEnviando(false);
  }

  const total = carrito.reduce(
    (sum, item) => sum + (item.con_sopa ? item.precio : item.precio - 1),
    0,
  );

  // ── Pantalla de carga ──
  if (cargando) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Cargando menú...</p>
      </div>
    );
  }

  // ── Sin menú configurado hoy ──
  if (menuHoy.length === 0 && !cargando) {
    return (
      <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-5xl mb-4">🍽️</p>
        <h1 className="text-xl font-bold text-gray-700 mb-2">
          Menú no disponible
        </h1>
        <p className="text-gray-400">
          El menú de hoy aún no está listo. Vuelve en unos minutos.
        </p>
      </div>
    );
  }

  // ── Confirmación de pedido enviado ──
  if (paso === "confirmacion") {
    return (
      <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-6xl mb-4">✅</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          ¡Pedido enviado!
        </h1>
        <p className="text-gray-500 mb-1">
          Mesa <span className="font-bold text-orange-500">{mesa}</span>
        </p>
        <p className="text-gray-400 text-sm">
          Tu pedido está siendo preparado.
        </p>
        <button
          onClick={() => {
            setCarrito([]);
            setMesa("");
            setPaso("menu");
            cargarMenu();
          }}
          className="mt-8 bg-orange-500 text-white px-6 py-2 rounded-xl font-semibold"
        >
          Hacer otro pedido
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Header */}
      <div className="bg-orange-500 text-white p-4 text-center shadow">
        {/* Logo del restaurante */}
        <img
          src="/logo.png"
          alt="La Tertulia Restaurante"
          className="h-24 mx-auto mb-2 object-contain"
        />
        <h1 className="text-xl font-bold">🍽️ Menú del Día</h1>
        {sopaDelDia && (
          <p className="text-orange-100 text-sm mt-1">
            🍲 Sopa del día: <span className="font-semibold">{sopaDelDia}</span>
          </p>
        )}
      </div>

      {/* ── Paso: Menú ── */}
      {paso === "menu" && (
        <div className="p-4 max-w-md mx-auto">
          <div className="space-y-3 mb-6">
            {menuHoy.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow p-4 flex justify-between items-center"
              >
                <div className="flex gap-3">
                  {item.platos.foto_url && (
                    <img
                      src={item.platos.foto_url}
                      alt={item.platos.nombre}
                      className="w-28 h-28 object-cover rounded-xl flex-shrink-0"
                    />
                  )}
                  <div>
                    <p className="font-bold text-gray-800">
                      {item.platos.nombre}
                    </p>
                    {item.platos.descripcion && (
                      <p className="text-sm text-gray-400">
                        {item.platos.descripcion}
                      </p>
                    )}
                    <p className="text-orange-500 font-semibold mt-1">
                      ${item.precio.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      Quedan: {item.cantidad_disponible}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => agregarAlCarrito(item)}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl transition text-sm"
                >
                  + Agregar
                </button>
              </div>
            ))}
          </div>

          {carrito.length > 0 && (
            <button
              onClick={() => setPaso("carrito")}
              className="w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 rounded-xl transition"
            >
              Ver carrito ({carrito.length}) — ${total.toLocaleString()}
            </button>
          )}
        </div>
      )}

      {/* ── Paso: Carrito ── */}
      {paso === "carrito" && (
        <div className="p-4 max-w-md mx-auto">
          <button
            onClick={() => setPaso("menu")}
            className="text-orange-500 font-semibold mb-4 flex items-center gap-1"
          >
            ← Volver al menú
          </button>

          <h2 className="text-lg font-bold text-gray-800 mb-3">Tu pedido</h2>

          <div className="space-y-3 mb-6">
            {carrito.map((item, index) => (
              <div key={index} className="bg-white rounded-xl shadow p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-semibold text-gray-800">{item.nombre}</p>
                  <button
                    onClick={() => eliminarDelCarrito(index)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    Quitar
                  </button>
                </div>
                <p className="text-orange-500 font-semibold text-sm mb-3">
                  $
                  {(item.con_sopa
                    ? item.precio
                    : item.precio - 1
                  ).toLocaleString()}
                  {!item.con_sopa && (
                    <span className="text-green-500 text-xs ml-2">
                      -$1 sin sopa
                    </span>
                  )}
                </p>

                {/* Toggle sopa */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">¿Con sopa?</span>
                  <button
                    onClick={() => toggleSopa(index)}
                    className={`px-3 py-1 rounded-full text-sm font-semibold transition
                      ${
                        item.con_sopa
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                  >
                    {item.con_sopa ? "✓ Con sopa" : "Sin sopa"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="bg-white rounded-xl shadow p-4 mb-4 flex justify-between items-center">
            <span className="font-semibold text-gray-700">Total</span>
            <span className="text-xl font-bold text-orange-500">
              ${total.toLocaleString()}
            </span>
          </div>

          {/* Número de mesa */}
          <div className="bg-white rounded-xl shadow p-4 mb-4">
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Número de mesa
            </label>
            <input
              type="number"
              placeholder="Ej: 5"
              value={mesa}
              onChange={(e) => setMesa(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 text-lg text-center font-bold"
            />
          </div>

          {mensaje && (
            <p className="text-center text-sm font-medium text-red-500 mb-3">
              {mensaje}
            </p>
          )}

          <button
            onClick={enviarPedido}
            disabled={enviando}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 text-lg"
          >
            {enviando ? "Enviando..." : "🚀 Enviar Pedido"}
          </button>
        </div>
      )}
    </div>
  );
}
