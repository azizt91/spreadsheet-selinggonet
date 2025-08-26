exports.handler = async function (event, context) {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*', // Izinkan akses dari mana saja
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: "Netlify function endpoint is working!" }),
  };
};
