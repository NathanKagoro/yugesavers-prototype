(function () {
  function formatCurrency(value) {
    return "£" + Number(value).toFixed(2);
  }

  function renderProducts(list) {
    var host = document.getElementById("shopProducts");
    if (!host) {
      return;
    }
    host.innerHTML = "";

    list.forEach(function (product) {
      var hasDiscount = Number(product.clubPrice) < Number(product.price);
      var pricing = hasDiscount
        ? '<p class="small mb-1"><span class="club-badge">On discount</span> <strong class="text-danger">' +
          formatCurrency(product.clubPrice) +
          "</strong> <span class=\"text-muted\">(" +
          formatCurrency(product.price) +
          ")</span></p>"
        : '<p class="small mb-1"><strong class="normal-price">' +
          formatCurrency(product.price) +
          "</strong></p>";

      host.insertAdjacentHTML(
        "beforeend",
        '<article class="product-card">' +
          '<img src="' +
          product.image +
          '" class="product-cover" alt="' +
          product.name +
          '">' +
          '<div class="p-2">' +
          '<p class="product-name mb-1">' +
          product.name +
          "</p>" +
          '<p class="small text-secondary mb-1">' +
          product.size +
          "</p>" +
          pricing +
          '<button class="btn btn-sm w-100 add-btn">Add</button>' +
          "</div></article>"
      );
    });
  }

  function setupShopPage() {
    if (!window.products) {
      return;
    }

    var buttons = document.querySelectorAll(".filter-btn");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (item) {
          item.classList.remove("active");
        });
        btn.classList.add("active");

        var filter = btn.getAttribute("data-filter");
        var filtered =
          filter === "all"
            ? window.products
            : window.products.filter(function (product) {
                return product.category === filter;
              });

        renderProducts(filtered);
      });
    });

    renderProducts(window.products);
  }

  document.addEventListener("DOMContentLoaded", setupShopPage);
})();
