const payload = {
  email: "testb3@example.com",
  password: "Password123!",
  username: "testb3",
  fitness_goal: "strength",
  height_cm: "180",
  weight_kg: "80", 
  age: "25",
  gender: "male"
};

fetch("http://127.0.0.1:3001/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
}).then(r => r.json().then(j => ({status: r.status, body: j})))
  .then(console.log)
  .catch(console.error);
