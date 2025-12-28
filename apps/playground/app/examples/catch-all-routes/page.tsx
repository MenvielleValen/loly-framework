import React from "react";

export default function CatchAllRoutesPage() {
  const testCases = [
    {
      title: "Case 1: Simple catch-all route",
      url: "/api/catch-all/test/path/here",
      description: "Tests a catch-all route with multiple segments",
    },
    {
      title: "Case 2: Catch-all route with query string",
      url: "/api/catch-all/test?foo=bar&baz=qux",
      description: "Tests catch-all with query parameters",
    },
    {
      title: "Case 3: Route with normal parameter + catch-all",
      url: "/api/files/123/documents/reports/2024",
      description: "Tests combination of normal parameter and catch-all",
    },
    {
      title: "Case 4: Normal route (no catch-all)",
      url: "/api/posts/456",
      description: "Verifies that normal routes don't break",
    },
    {
      title: "Case 5: Empty catch-all (base route)",
      url: "/api/catch-all",
      description: "Tests catch-all without additional segments",
    },
    {
      title: "Case 6: Catch-all with dashes (important for auth routes)",
      url: "/api/catch-all/sign-in/social/google",
      description: "Tests catch-all with dashes in segments",
    },
    {
      title: "Case 7: Catch-all with dashes and query string",
      url: "/api/catch-all/callback/google?code=123&state=abc",
      description: "Tests catch-all with dashes and query string",
    },
  ];

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Catch-All Routes Testing</h1>
      
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">What is being tested?</h2>
        <p className="text-gray-700 dark:text-gray-300">
          This page allows manual testing to verify that catch-all routes work correctly,
          especially that <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">req.originalUrl</code> and{" "}
          <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">req.params</code> are set automatically.
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
                Test: {testCase.url}
              </a>
              <code className="text-sm bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                {testCase.url}
              </code>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">How to verify</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
          <li>Click on each test case to open the URL in a new tab</li>
          <li>Verify that the JSON response contains:
            <ul className="list-disc list-inside ml-6 mt-2">
              <li><code>originalUrl</code> should contain the full path</li>
              <li><code>reqParams</code> should contain the captured parameters</li>
              <li><code>path</code> (for catch-all) should contain all captured segments</li>
            </ul>
          </li>
          <li>For cases with query string, verify that query parameters are present</li>
          <li>For cases with dashes, verify that dashes are preserved correctly</li>
        </ol>
      </div>
    </div>
  );
}

