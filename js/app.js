(function () {
  function formatCurrency(value) {
    return "£" + Number(value).toFixed(2);
  }

  function calcSavingPercent(oldPrice, newPrice) {
    return Math.round(((oldPrice - newPrice) / oldPrice) * 100);
  }

  function buildMealCard(meal, options) {
    var savingPercent = calcSavingPercent(meal.oldPrice, meal.newPrice);
    var ingredientsPreview = meal.ingredients.slice(0, 3).join(" • ");
    var href = "recipe.html?id=" + meal.id;
    return (
      '<a href="' +
      href +
      '" class="text-decoration-none">' +
      '<article class="card meal-card">' +
      '<img src="' +
      meal.image +
      '" class="meal-cover" alt="' +
      meal.name +
      '">' +
      '<div class="card-body">' +
      '<div class="d-flex justify-content-between align-items-start gap-2">' +
      '<h3 class="h4 mb-1 text-dark">' +
      meal.name +
      "</h3>" +
      '<span class="save-pill">' +
      savingPercent +
      "% Saved</span>" +
      "</div>" +
      '<p class="text-secondary small mb-2">' +
      ingredientsPreview +
      "</p>" +
      '<div class="price-row">' +
      '<span class="old-price">' +
      formatCurrency(meal.oldPrice) +
      "</span>" +
      '<span class="new-price">' +
      formatCurrency(meal.newPrice) +
      "</span>" +
      "</div>" +
      (options && options.showLeftCount
        ? '<p class="small fw-semibold text-danger mt-2 mb-0">Only ' +
          meal.leftCount +
          " bundles left</p>"
        : "") +
      "</div></article></a>"
    );
  }

  function buildMiniProductCard(product) {
    return (
      '<article class="mini-product">' +
      '<img src="' +
      product.image +
      '" class="mini-product-cover" alt="' +
      product.name +
      '">' +
      '<div class="p-2">' +
      '<p class="mini-product-name mb-1">' +
      product.name +
      "</p>" +
      '<p class="small text-secondary mb-1">' +
      product.size +
      "</p>" +
      '<p class="small mb-0"><strong class="text-danger">' +
      formatCurrency(product.clubPrice || product.price) +
      '</strong> <span class="text-muted">(' +
      formatCurrency(product.price) +
      ")</span></p></div></article>"
    );
  }

  function setBottomNavActive() {
    var page = document.body.getAttribute("data-page");
    var links = document.querySelectorAll(".bottom-nav .nav-link");
    links.forEach(function (link) {
      if (link.getAttribute("data-page") === page) {
        link.classList.add("active");
      }
    });
  }

  function showMiniToast(message) {
    var toast = document.createElement("div");
    toast.className = "toast-mini";
    toast.innerHTML = '<strong class="d-block mb-1">YugeSavers</strong>' + message;
    document.body.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.add("show");
    });
    setTimeout(function () {
      toast.classList.remove("show");
      setTimeout(function () {
        toast.remove();
      }, 320);
    }, 2800);
  }

  function setupHomePage() {
    var recHost = document.getElementById("recommendedMeals");
    if (!recHost || !window.meals) {
      return;
    }

    recHost.innerHTML = "";
    window.meals.slice(0, 2).forEach(function (meal, idx) {
      recHost.insertAdjacentHTML(
        "beforeend",
        buildMealCard(meal, { showLeftCount: idx === 0 })
      );
    });

    var buyAgainHost = document.getElementById("buyAgainProducts");
    if (buyAgainHost && window.products) {
      buyAgainHost.innerHTML = "";
      window.products.slice(0, 4).forEach(function (product) {
        buyAgainHost.insertAdjacentHTML("beforeend", buildMiniProductCard(product));
      });
    }

    setTimeout(function () {
      showMiniToast("1 rescue bundle published by Colindale staff and promoted to customers.");
    }, 600);
  }

  function setupOffersPage() {
    var host = document.getElementById("offersRescueMeals");
    if (!host || !window.meals) {
      return;
    }
    host.innerHTML = "";
    window.meals.slice(0, 2).forEach(function (meal, idx) {
      host.insertAdjacentHTML("beforeend", buildMealCard(meal, { showLeftCount: idx === 0 }));
    });
  }

  function setupRecipePage() {
    if (!window.meals) {
      return;
    }
    var params = new URLSearchParams(window.location.search);
    var recipeId = Number(params.get("id") || "1");
    var meal = window.meals.find(function (item) {
      return item.id === recipeId;
    });
    if (!meal) {
      meal = window.meals[0];
    }

    var saving = meal.oldPrice - meal.newPrice;
    var ingredientChecklist = meal.ingredients
      .map(function (item) {
        return '<li class="mb-2"><span class="text-success me-2">&#10003;</span>' + item + "</li>";
      })
      .join("");

    var recipeSteps = meal.recipeSteps
      .map(function (step, i) {
        return "<li>" + (i + 1) + ". " + step + "</li>";
      })
      .join("");

    var targetMap = {
      recipeTitle: meal.name,
      recipeHeroImage: meal.image,
      oldPrice: formatCurrency(meal.oldPrice),
      newPrice: formatCurrency(meal.newPrice),
      saveValue: formatCurrency(saving),
      leftCount: meal.leftCount,
      ingredientsList: ingredientChecklist,
      recipeSteps: recipeSteps
    };

    Object.keys(targetMap).forEach(function (key) {
      var node = document.getElementById(key);
      if (!node) {
        return;
      }
      if (key === "recipeHeroImage") {
        node.setAttribute("src", targetMap[key]);
      } else {
        node.innerHTML = targetMap[key];
      }
    });

    var addBtn = document.getElementById("addToBasketBtn");
    if (addBtn) {
      addBtn.addEventListener("click", function () {
        localStorage.setItem("selectedMealId", String(meal.id));
        showMiniToast("Bundle added to basket. Ready for checkout.");
      });
    }
  }

  function setupBasketPage() {
    if (!window.meals) {
      return;
    }
    var mealId = Number(localStorage.getItem("selectedMealId") || "1");
    var meal = window.meals.find(function (item) {
      return item.id === mealId;
    });
    if (!meal) {
      meal = window.meals[0];
    }
    var old = meal.oldPrice;
    var now = meal.newPrice;
    var discount = old - now;

    var fields = {
      basketMealName: meal.name,
      basketMealPrice: formatCurrency(now),
      basketOriginal: formatCurrency(old),
      basketDiscount: formatCurrency(discount),
      basketFinal: formatCurrency(now)
    };

    Object.keys(fields).forEach(function (id) {
      var node = document.getElementById(id);
      if (node) {
        node.textContent = fields[id];
      }
    });

    var groceriesHost = document.getElementById("groceryBasketList");
    var grocerySubtotal = 0;
    if (groceriesHost && window.products) {
      groceriesHost.innerHTML = "";
      var groceryItems = [
        { product: window.products[3], qty: 1 },
        { product: window.products[5], qty: 2 },
        { product: window.products[18], qty: 1 }
      ];

      groceryItems.forEach(function (line) {
        var lineTotal = line.product.clubPrice * line.qty;
        grocerySubtotal += lineTotal;
        groceriesHost.insertAdjacentHTML(
          "beforeend",
          '<div class="basket-line">' +
            '<img src="' +
            line.product.image +
            '" alt="' +
            line.product.name +
            '" class="basket-thumb">' +
            '<div class="flex-grow-1">' +
            '<p class="mb-0 fw-semibold">' +
            line.product.name +
            '</p><p class="small text-secondary mb-0">Qty ' +
            line.qty +
            " • " +
            line.product.size +
            '</p></div><strong>' +
            formatCurrency(lineTotal) +
            "</strong></div>"
        );
      });
    }

    var summary = {
      groceriesSubtotal: grocerySubtotal,
      rescueLine: now,
      totalDiscount: discount + 2.15,
      deliveryFee: 2.5
    };
    summary.grandTotal =
      summary.groceriesSubtotal + summary.rescueLine + summary.deliveryFee;

    var summaryMap = {
      groceriesSubtotal: formatCurrency(summary.groceriesSubtotal),
      rescueLine: formatCurrency(summary.rescueLine),
      totalDiscount: formatCurrency(summary.totalDiscount),
      deliveryFee: formatCurrency(summary.deliveryFee),
      grandTotal: formatCurrency(summary.grandTotal)
    };

    Object.keys(summaryMap).forEach(function (id) {
      var node = document.getElementById(id);
      if (node) {
        node.textContent = summaryMap[id];
      }
    });

    var checkoutBtn = document.getElementById("checkoutBtn");
    var checkoutMessage = document.getElementById("checkoutMessage");
    if (checkoutBtn && checkoutMessage) {
      checkoutBtn.addEventListener("click", function () {
        checkoutMessage.classList.remove("d-none");
        checkoutMessage.textContent = "Order Confirmed";
      });
    }
  }

  function boot() {
    setBottomNavActive();
    setupHomePage();
    setupOffersPage();
    setupRecipePage();
    setupBasketPage();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
