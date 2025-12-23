import React from "react";

export default function CatchAllRoutesPage() {
  const testCases = [
    {
      title: "Caso 1: Ruta catch-all simple",
      url: "/api/catch-all/test/path/here",
      description: "Prueba una ruta catch-all con múltiples segmentos",
    },
    {
      title: "Caso 2: Ruta catch-all con query string",
      url: "/api/catch-all/test?foo=bar&baz=qux",
      description: "Prueba catch-all con parámetros de query",
    },
    {
      title: "Caso 3: Ruta con parámetro normal + catch-all",
      url: "/api/files/123/documents/reports/2024",
      description: "Prueba combinación de parámetro normal y catch-all",
    },
    {
      title: "Caso 4: Ruta normal (sin catch-all)",
      url: "/api/posts/456",
      description: "Verifica que rutas normales no se rompan",
    },
    {
      title: "Caso 5: Catch-all vacío (ruta base)",
      url: "/api/catch-all",
      description: "Prueba catch-all sin segmentos adicionales",
    },
    {
      title: "Caso 6: Catch-all con guiones (importante para auth routes)",
      url: "/api/catch-all/sign-in/social/google",
      description: "Prueba catch-all con guiones en los segmentos",
    },
    {
      title: "Caso 7: Catch-all con guiones y query string",
      url: "/api/catch-all/callback/google?code=123&state=abc",
      description: "Prueba catch-all con guiones y query string",
    },
  ];

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Catch-All Routes Testing</h1>
      
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">¿Qué se está probando?</h2>
        <p className="text-gray-700 dark:text-gray-300">
          Esta página permite probar manualmente que las rutas catch-all funcionen correctamente,
          especialmente que <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">req.originalUrl</code> y{" "}
          <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">req.params</code> se establezcan automáticamente.
        </p>
      </div>

      <div className="space-y-4">
        {testCases.map((testCase, index) => (
          <div
            key={index}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <h3 className="text-lg font-semibold mb-2">{testCase.title}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-3">{testCase.description}</p>
            <div className="flex items-center gap-4">
              <a
                href={testCase.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Probar: {testCase.url}
              </a>
              <code className="text-sm bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                {testCase.url}
              </code>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Cómo verificar</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
          <li>Haz clic en cada caso de prueba para abrir la URL en una nueva pestaña</li>
          <li>Verifica que la respuesta JSON contenga:
            <ul className="list-disc list-inside ml-6 mt-2">
              <li><code>originalUrl</code> debe contener el path completo</li>
              <li><code>reqParams</code> debe contener los parámetros capturados</li>
              <li><code>path</code> (para catch-all) debe contener todos los segmentos capturados</li>
            </ul>
          </li>
          <li>Para casos con query string, verifica que los parámetros de query estén presentes</li>
          <li>Para casos con guiones, verifica que los guiones se preserven correctamente</li>
        </ol>
      </div>
    </div>
  );
}

