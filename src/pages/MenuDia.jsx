import { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function MenuDia() {
  const [platos, setPlatos] = useState([]);
  const [sopas, setSopas] = useState([]);
  const [sopaSeleccionada, setSopaSeleccionada] = useState("");
  const [platosActivos, setPlatosActivos] = useState({});
  // platosActivos = { [plato.id]: { activo: bool, precio: '', cantidad: '' } }
  const [menuHoy, setMenuHoy] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const hoy = new Date().toISOString().split("T")[0];

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    // Carga platos, sopas y menú de hoy en paralelo
    const [{ data: dataPlatos }, { data: dataSopas }, { data: dataMenu }] =
      await Promise.all([
        supabase.from("platos").select("*").order("nombre"),
        supabase.from("sopas").select("*").order("nombre"),
        supabase.from("menu_dia").select("*").eq("fecha", hoy),
      ]);

    if (dataPlatos) setPlatos(dataPlatos);
    if (dataSopas) setSopas(dataSopas);

    if (dataMenu && dataMenu.length > 0) {
      // Ya hay menú configurado hoy — cargar estado existente
      setMenuHoy(dataMenu);
      setSopaSeleccionada(dataMenu[0].sopa_id);

      const estado = {};
      dataMenu.forEach((item) => {
        estado[item.plato_id] = {
          activo: true,
          precio: item.precio.toString(),
          cantidad: item.cantidad_disponible.toString(),
          menu_dia_id: item.id,
        };
      });
      setPlatosActivos(estado);
    }
  }

  function togglePlato(id) {
    setPlatosActivos((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        activo: !prev[id]?.activo,
        precio: prev[id]?.precio || "",
        cantidad: prev[id]?.cantidad || "",
      },
    }));
  }

  function cambiarCampo(id, campo, valor) {
    setPlatosActivos((prev) => ({
      ...prev,
      [id]: { ...prev[id], activo: true, [campo]: valor },
    }));
  }

  async function guardarMenu() {
    if (!sopaSeleccionada) {
      setMensaje("❌ Selecciona la sopa del día");
      setTimeout(() => setMensaje(""), 3000);
      return;
    }

    const seleccionados = platos.filter((p) => platosActivos[p.id]?.activo);

    if (seleccionados.length === 0) {
      setMensaje("❌ Selecciona al menos un plato");
      setTimeout(() => setMensaje(""), 3000);
      return;
    }

    for (const plato of seleccionados) {
      const info = platosActivos[plato.id];
      if (!info.precio || !info.cantidad) {
        setMensaje(`❌ Falta precio o cantidad en "${plato.nombre}"`);
        setTimeout(() => setMensaje(""), 3000);
        return;
      }
    }

    setCargando(true);

    // Borrar menú de hoy y volver a insertar
    await supabase.from("menu_dia").delete().eq("fecha", hoy);

    const filas = seleccionados.map((plato) => ({
      fecha: hoy,
      plato_id: plato.id,
      sopa_id: sopaSeleccionada,
      precio: parseFloat(platosActivos[plato.id].precio),
      cantidad_disponible: parseInt(platosActivos[plato.id].cantidad),
    }));

    const { error } = await supabase.from("menu_dia").insert(filas);

    if (!error) {
      setMensaje("✅ Menú del día guardado");
      cargarDatos();
    } else {
      setMensaje("❌ Error al guardar");
    }

    setCargando(false);
    setTimeout(() => setMensaje(""), 3000);
  }

  async function bajarStock(plato_id) {
    const item = menuHoy.find((m) => m.plato_id === plato_id);
    if (!item || item.cantidad_disponible <= 0) return;

    const nuevaCantidad = item.cantidad_disponible - 1;

    const { error } = await supabase
      .from("menu_dia")
      .update({ cantidad_disponible: nuevaCantidad })
      .eq("id", item.id);

    if (!error) cargarDatos();
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Sopa del día */}
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <h2 className="text-lg font-semibold mb-3 text-gray-700">
          🍲 Sopa del Día
        </h2>
        <select
          value={sopaSeleccionada}
          onChange={(e) => setSopaSeleccionada(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="">Selecciona la sopa de hoy</option>
          {sopas.map((sopa) => (
            <option key={sopa.id} value={sopa.id}>
              {sopa.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Selección de platos */}
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <h2 className="text-lg font-semibold mb-3 text-gray-700">
          🍽️ Platos Activos Hoy
        </h2>
        <div className="space-y-3">
          {platos.map((plato) => {
            const info = platosActivos[plato.id];
            const activo = info?.activo || false;

            return (
              <div
                key={plato.id}
                className={`border rounded-xl p-3 transition ${activo ? "border-orange-400 bg-orange-50" : "border-gray-200"}`}
              >
                {/* Checkbox y nombre */}
                <label className="flex items-center gap-3 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={() => togglePlato(plato.id)}
                    className="w-4 h-4 accent-orange-500"
                  />
                  {plato.foto_url && (
                    <img
                      src={plato.foto_url}
                      alt={plato.nombre}
                      className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <span className="font-semibold text-gray-800">
                    {plato.nombre}
                  </span>
                </label>

                {/* Precio y cantidad — solo si está activo */}
                {activo && (
                  <div className="flex gap-2 mt-1">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">
                        Precio ($)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: 14000"
                        value={
                          info?.precio
                            ? Number(info.precio).toLocaleString("es-CO")
                            : ""
                        }
                        onChange={(e) => {
                          const soloNumeros = e.target.value
                            .replace(/\./g, "")
                            .replace(/[^0-9]/g, "");
                          cambiarCampo(plato.id, "precio", soloNumeros);
                        }}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={info?.cantidad || ""}
                        onChange={(e) =>
                          cambiarCampo(plato.id, "cantidad", e.target.value)
                        }
                        className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Botón guardar */}
      <button
        onClick={guardarMenu}
        disabled={cargando}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 mb-6"
      >
        {cargando ? "Guardando..." : "Guardar Menú del Día"}
      </button>

      {mensaje && (
        <p className="text-center text-sm font-medium text-gray-600 mb-4">
          {mensaje}
        </p>
      )}

      {/* Control de stock manual */}
      {menuHoy.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">
            📦 Bajar Stock Manualmente
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            Úsalo cuando alguien pide por llamada
          </p>
          <div className="space-y-2">
            {menuHoy.map((item) => {
              const plato = platos.find((p) => p.id === item.plato_id);
              return (
                <div
                  key={item.id}
                  className="flex justify-between items-center border border-gray-100 rounded-xl px-3 py-2"
                >
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      {plato?.nombre}
                    </p>
                    <p className="text-xs text-gray-400">
                      Disponibles:{" "}
                      <span
                        className={`font-bold ${item.cantidad_disponible === 0 ? "text-red-500" : "text-green-600"}`}
                      >
                        {item.cantidad_disponible}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => bajarStock(item.plato_id)}
                    disabled={item.cantidad_disponible === 0}
                    className="bg-red-100 hover:bg-red-200 text-red-600 font-bold px-3 py-1 rounded-lg text-sm transition disabled:opacity-40"
                  >
                    -1
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
