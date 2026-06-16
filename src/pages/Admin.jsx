import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import MenuDia from "./MenuDia";

export default function Admin() {
  const [seccion, setSeccion] = useState("platos"); // platos | sopas | menu

  // ── Platos ──
  const [platos, setPlatos] = useState([]);
  const [nombrePlato, setNombrePlato] = useState("");
  const [descripcionPlato, setDescripcionPlato] = useState("");
  const [fotoPlato, setFotoPlato] = useState(null);
  const [previstaFoto, setPrevistaFoto] = useState(null);

  // ── Sopas ──
  const [sopas, setSopas] = useState([]);
  const [nombreSopa, setNombreSopa] = useState("");

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarPlatos();
    cargarSopas();
  }, []);

  // ── Funciones Platos ──
  async function cargarPlatos() {
    const { data, error } = await supabase
      .from("platos")
      .select("*")
      .order("nombre");
    if (!error) setPlatos(data);
  }

  async function agregarPlato() {
    if (!nombrePlato.trim()) return;
    setCargando(true);

    let foto_url = null;

    // Si hay foto, subirla primero a Supabase Storage
    if (fotoPlato) {
      const extension = fotoPlato.name.split(".").pop();
      const nombreArchivo = `${Date.now()}.${extension}`;

      const { error: errorStorage } = await supabase.storage
        .from("platos")
        .upload(nombreArchivo, fotoPlato);

      if (!errorStorage) {
        const { data: urlData } = supabase.storage
          .from("platos")
          .getPublicUrl(nombreArchivo);
        foto_url = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from("platos").insert({
      nombre: nombrePlato.trim(),
      descripcion: descripcionPlato.trim(),
      foto_url,
    });

    if (!error) {
      setMensaje("✅ Plato agregado");
      setNombrePlato("");
      setDescripcionPlato("");
      setFotoPlato(null);
      setPrevistaFoto(null);
      cargarPlatos();
    } else {
      setMensaje("❌ Error al agregar");
    }

    setCargando(false);
    setTimeout(() => setMensaje(""), 3000);
  }

  +async function eliminarPlato(id) {
    const { error } = await supabase.from("platos").delete().eq("id", id);
    if (!error) cargarPlatos();
  };

  // ── Funciones Sopas ──
  async function cargarSopas() {
    const { data, error } = await supabase
      .from("sopas")
      .select("*")
      .order("nombre");
    if (!error) setSopas(data);
  }

  async function agregarSopa() {
    if (!nombreSopa.trim()) return;
    setCargando(true);
    const { error } = await supabase
      .from("sopas")
      .insert({ nombre: nombreSopa.trim() });
    if (!error) {
      setMensaje("✅ Sopa agregada");
      setNombreSopa("");
      cargarSopas();
    } else {
      setMensaje("❌ Error al agregar");
    }
    setCargando(false);
    setTimeout(() => setMensaje(""), 3000);
  }

  async function eliminarSopa(id) {
    const { error } = await supabase.from("sopas").delete().eq("id", id);
    if (!error) cargarSopas();
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
        Panel Administrativo
      </h1>

      {/* Navegación entre secciones */}
      <div className="flex max-w-md mx-auto mb-6 bg-white rounded-xl shadow overflow-hidden">
        {["platos", "sopas", "menu"].map((s) => (
          <button
            key={s}
            onClick={() => setSeccion(s)}
            className={`flex-1 py-2 text-sm font-semibold capitalize transition
              ${
                seccion === s
                  ? "bg-orange-500 text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
          >
            {s === "menu"
              ? "Menú del Día"
              : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Sección Platos ── */}
      {seccion === "platos" && (
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">
              Agregar Plato a la Carta
            </h2>
            <input
              type="text"
              placeholder="Nombre del plato"
              value={nombrePlato}
              onChange={(e) => setNombrePlato(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <textarea
              placeholder="Descripción (opcional)"
              value={descripcionPlato}
              onChange={(e) => setDescripcionPlato(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              rows={2}
            />
            {/* Input de foto */}
            <div className="mb-3">
              <label className="text-sm text-gray-500 block mb-1">
                Foto del plato (opcional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setFotoPlato(file);
                    setPrevistaFoto(URL.createObjectURL(file));
                  }
                }}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-orange-100 file:text-orange-600 hover:file:bg-orange-200"
              />
              {previstaFoto && (
                <div className="mt-2 relative">
                  <img
                    src={previstaFoto}
                    alt="Vista previa"
                    className="w-full h-32 object-cover rounded-xl"
                  />
                  <button
                    onClick={() => {
                      setFotoPlato(null);
                      setPrevistaFoto(null);
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={agregarPlato}
              disabled={cargando}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-xl transition disabled:opacity-50"
            >
              {cargando ? "Guardando..." : "Agregar Plato"}
            </button>
            {mensaje && (
              <p className="text-center mt-3 text-sm font-medium text-gray-600">
                {mensaje}
              </p>
            )}
          </div>

          <h2 className="text-lg font-semibold mb-3 text-gray-700">
            Carta Completa ({platos.length} platos)
          </h2>
          {platos.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No hay platos aún.</p>
          ) : (
            <div className="space-y-2">
              {platos.map((plato) => (
                <div
                  key={plato.id}
                  className="bg-white rounded-xl shadow px-4 py-3 flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    {plato.foto_url && (
                      <img
                        src={plato.foto_url}
                        alt={plato.nombre}
                        className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-gray-800">
                        {plato.nombre}
                      </p>
                      {plato.descripcion && (
                        <p className="text-sm text-gray-500">
                          {plato.descripcion}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => eliminarPlato(plato.id)}
                    className="text-red-400 hover:text-red-600 text-sm font-medium ml-4"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Sección Sopas ── */}
      {seccion === "sopas" && (
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">
              Agregar Sopa al Catálogo
            </h2>
            <input
              type="text"
              placeholder="Nombre de la sopa"
              value={nombreSopa}
              onChange={(e) => setNombreSopa(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              onClick={agregarSopa}
              disabled={cargando}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-xl transition disabled:opacity-50"
            >
              {cargando ? "Guardando..." : "Agregar Sopa"}
            </button>
            {mensaje && (
              <p className="text-center mt-3 text-sm font-medium text-gray-600">
                {mensaje}
              </p>
            )}
          </div>

          <h2 className="text-lg font-semibold mb-3 text-gray-700">
            Sopas disponibles ({sopas.length})
          </h2>
          {sopas.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No hay sopas aún.</p>
          ) : (
            <div className="space-y-2">
              {sopas.map((sopa) => (
                <div
                  key={sopa.id}
                  className="bg-white rounded-xl shadow px-4 py-3 flex justify-between items-center"
                >
                  <p className="font-semibold text-gray-800">{sopa.nombre}</p>
                  <button
                    onClick={() => eliminarSopa(sopa.id)}
                    className="text-red-400 hover:text-red-600 text-sm font-medium ml-4"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Sección Menú del Día ── (próximamente) */}
      {seccion === "menu" && <MenuDia />}
    </div>
  );
}
