export async function logTrialResult(data: any) {
  try {
    const endpoint =
      "https://script.google.com/macros/s/AKfycbxGppRX8yWKvm6RLx61dkVg6yjIpjChRPwVIwYG5g8EYEGOTNiLV4yDDqhhKt5nSIw/exec";

    const res = await fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    // no-cors means no response, but that's fine
    console.log("Logged:", data);
  } catch (err) {
    console.error("Logging failed:", err);
  }
}
