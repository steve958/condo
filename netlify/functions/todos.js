exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    switch (event.httpMethod) {
      case "GET": {
        const todos = [
          { id: "1", title: "Explore the new app", completed: false },
          { id: "2", title: "Add your first task", completed: true },
        ];
        return { statusCode: 200, headers, body: JSON.stringify({ todos }) };
      }
      case "POST": {
        const data = JSON.parse(event.body || "{}");
        const created = { id: String(Date.now()), ...data };
        return { statusCode: 201, headers, body: JSON.stringify(created) };
      }
      default:
        return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(err) }) };
  }
};
