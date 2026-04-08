export const onRequestGet: PagesFunction = async () => {
  return new Response(
    JSON.stringify({ ok: true, route: "/api/store" }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8"
      }
    }
  );
};
