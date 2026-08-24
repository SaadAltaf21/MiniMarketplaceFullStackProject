const AUTH_API = "http://localhost:3000";
const PRODUCT_API = "http://localhost:5000";

let products = [];
let editId = null;
let deleteId = null;


// ================= ELEMENTS =================

const $ = id => document.getElementById(id);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'\"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
}[character]));
const safeImageUrl = (value) => {
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) ? escapeHtml(url.href) : "";
    } catch {
        return "";
    }
};

const authScreen = $("authScreen");
const appScreen = $("appScreen");

const loginForm = $("loginForm");
const signupForm = $("signupForm");
const productForm = $("productForm");

const productModal = $("productModal");
const deleteModal = $("deleteModal");

const productsBox = $("products");
const loading = $("loading");
const empty = $("empty");


// ================= TOAST =================

const toast = (message, error = false) => {

    $("toast").textContent = message;
    $("toast").className = `show ${error ? "error" : ""}`;

    setTimeout(() => {
        $("toast").className = "";
    }, 2500);
};


// ================= AUTH =================

const token = () => {
    return sessionStorage.getItem("token");
};


const user = () => {
    return JSON.parse(
        sessionStorage.getItem("user") || "null"
    );
};


const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token()}`
});


const saveLogin = (data) => {

    sessionStorage.setItem("token", data.token);
    sessionStorage.setItem(
        "user",
        JSON.stringify(data.data)
    );
};


const logoutUser = () => {

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    appScreen.classList.add("hide");
    authScreen.classList.remove("hide");

    loginForm.reset();
};


// ================= LOGIN / SIGNUP TABS =================

$("loginTab").onclick = () => {

    $("loginTab").classList.add("active");
    $("signupTab").classList.remove("active");

    loginForm.classList.remove("hide");
    signupForm.classList.add("hide");
};


$("signupTab").onclick = () => {

    $("signupTab").classList.add("active");
    $("loginTab").classList.remove("active");

    signupForm.classList.remove("hide");
    loginForm.classList.add("hide");
};


// ================= SIGNUP =================

signupForm.onsubmit = async (e) => {

    e.preventDefault();

    const fullName = $("signupName").value.trim();
    const email = $("signupEmail").value.trim();
    const password = $("signupPassword").value;
    const confirmPassword =
        $("signupConfirmPassword").value;

    if (!fullName || !email || !password || !confirmPassword) {
        return toast("Please fill all fields", true);
    }

    if (password !== confirmPassword) {
        return toast("Passwords do not match", true);
    }

    try {

        const response = await fetch(
            `${AUTH_API}/signUp`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    fullName,
                    email,
                    password,
                    confirmPassword
                })
            }
        );

        const data = await response.json();

        if (!response.ok || data.status === false) {
            return toast(
                data.message || "Signup failed",
                true
            );
        }

        toast("Account created successfully!");

        signupForm.reset();

        $("loginEmail").value = email;

        $("loginTab").click();

    } catch (error) {

        toast("Backend connection failed", true);
    }
};


// ================= LOGIN =================

loginForm.onsubmit = async (e) => {

    e.preventDefault();

    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;

    if (!email || !password) {
        return toast("Please fill all fields", true);
    }


    try {

        const response = await fetch(
            `${AUTH_API}/login`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok || data.status === false) {
            return toast(
                data.message || "Login failed",
                true
            );
        }

        saveLogin(data);

        showDashboard();

        toast("Login successful!");

    } catch (error) {

        toast("Backend connection failed", true);
    }
};


// ================= DASHBOARD =================

const showDashboard = () => {

    authScreen.classList.add("hide");
    appScreen.classList.remove("hide");

    const currentUser = user();

    const name =
        currentUser?.name ||
        currentUser?.fullName ||
        "User";

    $("userName").textContent = name;
    $("userEmail").textContent =
        currentUser?.email || "";

    $("avatar").textContent =
        name[0].toUpperCase();

    getProducts();
};


// ================= LOGOUT =================

$("logout").onclick = async () => {

    try {

        await fetch(
            `${AUTH_API}/logout`,
            {
                method: "POST",
                headers: headers()
            }
        );

    } catch (error) {}

    logoutUser();

    toast("Logged out successfully");
};


// ================= GET PRODUCTS =================

const getProducts = async () => {

    loading.classList.remove("hide");
    empty.classList.add("hide");
    productsBox.innerHTML = "";

    try {

        const response = await fetch(
            `${PRODUCT_API}/getProduct`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Products not found"
            );
        }

        products = data.data || [];

        showProducts();
        updateStats();

    } catch (error) {

        productsBox.innerHTML = `
            <div class="empty">
                <div>⚠️</div>
                <h3>Products load nahi huye</h3>
                <p>${error.message}</p>
            </div>
        `;

    } finally {

        loading.classList.add("hide");
    }
};


// ================= DISPLAY PRODUCTS =================

const showProducts = () => {

    const searchText =
        $("search").value.toLowerCase();

    const list = products.filter(product => {

        const title =
            (product.title || "").toLowerCase();

        const category =
            (product.category || "").toLowerCase();

        return (
            title.includes(searchText) ||
            category.includes(searchText)
        );
    });


    if (!list.length) {

        productsBox.innerHTML = "";
        empty.classList.remove("hide");

        return;
    }

    empty.classList.add("hide");


    productsBox.innerHTML = list.map(product => `

        <article class="card">

            <div class="card-image">

                ${
                    product.image
                    ? `<img src="${safeImageUrl(product.image)}" alt="${escapeHtml(product.title)}">`
                    : `<div style="
                        height:100%;
                        display:grid;
                        place-items:center;
                        font-size:45px;
                    ">🛍️</div>`
                }

                <span class="badge">
                    ${escapeHtml(product.category)}
                </span>

            </div>


            <div class="card-body">

                <h3>${escapeHtml(product.title)}</h3>

                <p>${escapeHtml(product.description)}</p>

                <div class="card-bottom">

                    <div class="price">
                        Rs. ${Number(product.price).toLocaleString()}
                    </div>

                    ${product.seller?._id === user()?.id ? `<div class="actions">

                        <button
                            onclick="editProduct('${product._id}')">
                            ✎
                        </button>

                        <button
                            class="delete"
                            onclick="openDelete('${product._id}')">
                            ×
                        </button>

                    </div>` : ""}

                </div>

            </div>

        </article>

    `).join("");
};


// ================= STATS =================

const updateStats = () => {

    $("total").textContent = products.length;

    if (!products.length) {
        $("average").textContent = "Rs. 0";
        return;
    }

    const totalPrice = products.reduce(
        (sum, product) =>
            sum + Number(product.price || 0),
        0
    );

    $("average").textContent =
        `Rs. ${Math.round(
            totalPrice / products.length
        ).toLocaleString()}`;
};


// ================= OPEN CREATE MODAL =================

const openCreate = () => {

    editId = null;

    productForm.reset();

    $("modalTitle").textContent =
        "Create Product";

    $("saveText").textContent =
        "Create Product";

    productModal.classList.remove("hide");
};


$("addProduct").onclick = openCreate;
$("firstProduct").onclick = openCreate;


// ================= CLOSE PRODUCT MODAL =================

const closeProduct = () => {

    productModal.classList.add("hide");
    productForm.reset();
    editId = null;
};


$("closeProduct").onclick = closeProduct;
$("cancelProduct").onclick = closeProduct;

document.querySelector(
    "#productModal .overlay"
).onclick = closeProduct;


// ================= CREATE / UPDATE =================

productForm.onsubmit = async (e) => {

    e.preventDefault();

    const product = {

        title: $("title").value.trim(),

        price: Number(
            $("price").value
        ),

        category:
            $("category").value.trim(),

        condition:
            $("condition").value,

        location:
            $("location").value.trim(),

        image:
            $("image").value.trim(),

        description:
            $("description").value.trim()
    };


    if (
        !product.title ||
        !product.price ||
        !product.category ||
        !product.condition ||
        !product.location ||
        !product.description
    ) {
        return toast(
            "Please fill all required fields",
            true
        );
    }


    const url = editId

        ? `${PRODUCT_API}/updateProduct/${editId}`

        : `${PRODUCT_API}/productCreate`;


    try {

        const response = await fetch(
            url,
            {
                method: editId ? "PUT" : "POST",
                headers: headers(),
                body: JSON.stringify(product)
            }
        );


        const data = await response.json();


        if (
            response.status === 401 ||
            response.status === 403
        ) {
            logoutUser();
            return toast(
                "Session expired",
                true
            );
        }


        if (!response.ok || data.status === false) {
            return toast(
                data.message || "Operation failed",
                true
            );
        }


        closeProduct();

        toast(
            editId
                ? "Product updated successfully!"
                : "Product created successfully!"
        );

        getProducts();


    } catch (error) {

        toast(
            "Backend connection failed",
            true
        );
    }
};


// ================= EDIT =================

window.editProduct = (id) => {

    const product =
        products.find(item => item._id === id);

    if (!product) return;

    editId = id;

    $("modalTitle").textContent =
        "Update Product";

    $("saveText").textContent =
        "Update Product";

    $("title").value =
        product.title || "";

    $("price").value =
        product.price || "";

    $("category").value =
        product.category || "";

    $("condition").value =
        product.condition || "";

    $("location").value =
        product.location || "";

    $("image").value =
        product.image || "";

    $("description").value =
        product.description || "";

    productModal.classList.remove("hide");
};


// ================= DELETE =================

window.openDelete = (id) => {

    deleteId = id;

    deleteModal.classList.remove("hide");
};


const closeDelete = () => {

    deleteId = null;

    deleteModal.classList.add("hide");
};


$("cancelDelete").onclick = closeDelete;

document.querySelector(
    "#deleteModal .overlay"
).onclick = closeDelete;


$("deleteProduct").onclick = async () => {

    if (!deleteId) return;

    try {

        const response = await fetch(
            `${PRODUCT_API}/deleteProduct/${deleteId}`,
            {
                method: "DELETE",
                headers: headers()
            }
        );


        const data = await response.json();


        if (
            response.status === 401 ||
            response.status === 403
        ) {
            logoutUser();
            return;
        }


        if (!response.ok || data.status === false) {
            return toast(
                data.message || "Delete failed",
                true
            );
        }


        closeDelete();

        toast("Product deleted successfully!");

        getProducts();


    } catch (error) {

        toast(
            "Backend connection failed",
            true
        );
    }
};


// ================= SEARCH / REFRESH =================

$("search").oninput = showProducts;

$("refresh").onclick = getProducts;


// ================= START APP =================

if (token()) {

    showDashboard();

} else {

    authScreen.classList.remove("hide");
    appScreen.classList.add("hide");
}
