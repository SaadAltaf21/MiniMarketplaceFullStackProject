const API = "http://localhost:3000";
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'\"]/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  '"': "&quot;",
}[character]));

const products = document.getElementById("products");
const auth = document.getElementById("auth");
const productModal = document.getElementById("productModal");

const token = () => localStorage.getItem("token");

const message = (text) => {
  document.getElementById("message").textContent = text;

  setTimeout(() => {
    document.getElementById("message").textContent = "";
  }, 2500);
};

// ---------- AUTH ----------

const openLogin = () => {
  auth.classList.remove("hidden");
  document.getElementById("loginBox").classList.remove("hidden");
  document.getElementById("signupBox").classList.add("hidden");
};

const openSignup = () => {
  auth.classList.remove("hidden");
  document.getElementById("signupBox").classList.remove("hidden");
  document.getElementById("loginBox").classList.add("hidden");
};

document.getElementById("loginBtn").onclick = openLogin;
document.getElementById("signupBtn").onclick = openSignup;
document.getElementById("goLogin").onclick = openLogin;
document.getElementById("goSignup").onclick = openSignup;

document.getElementById("closeAuth").onclick = () => {
  auth.classList.add("hidden");
};

// ---------- SIGNUP ----------

document.getElementById("doSignup").onclick = async () => {
  const data = {
    fullName: document.getElementById("name").value,
    email: document.getElementById("email").value,
    password: document.getElementById("password").value,
    confirmPassword: document.getElementById("confirmPassword").value,
  };

  if (data.password !== data.confirmPassword)
    return message("Passwords do not match");

  const res = await fetch(`${API}/signUp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  message(result.message);

  if (result.status) openLogin();
};

// ---------- LOGIN ----------

const loginUser = async () => {
  const email = loginEmail.value;
  const password = loginPassword.value;

  const response = await fetch("http://localhost:3000/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!data.status) {
    alert(data.message);
    return;
  }

  // IMPORTANT
  localStorage.setItem("token", data.token);

  alert("Login Successfully");

  getProducts();
};

// ---------- LOGOUT ----------

document.getElementById("logoutBtn").onclick = () => {
  localStorage.removeItem("token");
  location.reload();
};

// ---------- ADD PRODUCT ----------

const openProduct = () => {
  if (!token()) {
    message("Please Login First");
    return openLogin();
  }

  productModal.classList.remove("hidden");
};

document.getElementById("addBtn").onclick = openProduct;
document.getElementById("heroAdd").onclick = openProduct;

document.getElementById("closeProduct").onclick = () => {
  productModal.classList.add("hidden");
};

document.getElementById("saveProduct").onclick = async () => {
  const data = {
    title: productName.value,
    price: productPrice.value,
    image: productImage.value,
    description: productDescription.value,
    category: productCategory.value,
  };

  const res = await fetch("http://localhost:5000/productCreate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
    },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  message(result.message);

  if (result.data) {
    productModal.classList.add("hidden");
    getProducts();
  }
};

// ---------- PRODUCTS ----------

const getProducts = async () => {
  const res = await fetch("http://localhost:5000/getProduct");
  const data = await res.json();

  products.innerHTML = data.data
    .map(
      (product) => `
    <div class="product">
      <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}">
      <h3>${escapeHtml(product.title)}</h3>
      <p class="price">$${product.price}</p>
      <p class="price">${escapeHtml(product.description)}</p>

      ${
        token() && product.seller?._id === getUserId()
          ? `
            <div class="actions">
              <button onclick="updateProduct('${product._id}')">
                Update
              </button>

              <button onclick="deleteProduct('${product._id}')">
                Delete
              </button>
            </div>
          `
          : ""
      }
    </div>
  `,
    )
    .join("");
};

const getUserId = () => {
  const jwt = token();

  if (!jwt) return null;

  const payload = JSON.parse(atob(jwt.split(".")[1]));

  return payload.userId;
};

// ---------- START ----------

if (token()) {
  document.getElementById("loginBtn").classList.add("hidden");
  document.getElementById("signupBtn").classList.add("hidden");
  document.getElementById("logoutBtn").classList.remove("hidden");
}

getProducts();



const updateProduct = (_id) => {
  const title = prompt("Update Title");
  const price = prompt("Update Price");
  const description = prompt("Update Description");
  const category = prompt("Update Category");

//   if (!fullName || !email || !password) {
//     alert("Fields Are Empty");
//     return;
//   }

  const data = {
    title,
    price,
    description,
    category
  };

  fetch(`http://localhost:5000/updateProduct/${_id}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token()}`,
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())

    .then((products) => {
    //   console.log(pro);
      alert("Product Updated Successfully");
    })
    .catch((error) => {
      console.log(error);
    });
};
