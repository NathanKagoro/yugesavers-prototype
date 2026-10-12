(function () {
  function formatCurrency(value) {
    return "£" + Number(value).toFixed(2);
  }

  function savingPercent(oldPrice, newPrice) {
    return Math.round(((oldPrice - newPrice) / oldPrice) * 100);
  }

  function renderRecipeCards(list) {
    var host = document.getElementById("recipesGrid");
    if (!host) {
      return;
    }
    host.innerHTML = "";

    list.forEach(function (meal) {
      host.insertAdjacentHTML(
        "beforeend",
        '<div class="col-12">' +
          '<a class="text-decoration-none" href="recipe.html?id=' +
          meal.id +
          '">' +
          '<article class="card meal-card m-0 mb-3">' +
          '<img src="' +
          meal.image +
          '" class="meal-cover" alt="' +
          meal.name +
          '">' +
          '<div class="card-body">' +
          '<h3 class="h4 mb-1 text-dark">' +
          meal.name +
          "</h3>" +
          '<p class="small text-secondary mb-2">' +
          meal.ingredients.slice(0, 3).join(" • ") +
          "</p>" +
          '<div class="d-flex justify-content-between align-items-center">' +
          '<p class="mb-0"><span class="old-price me-2">' +
          formatCurrency(meal.oldPrice) +
          '</span><span class="new-price">' +
          formatCurrency(meal.newPrice) +
          "</span></p>" +
          '<span class="save-pill">' +
          savingPercent(meal.oldPrice, meal.newPrice) +
          "% Saved</span>" +
          "</div></div></article></a></div>"
      );
    });
  }

  function setupFilters() {
    if (!window.meals) {
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
            ? window.meals
            : window.meals.filter(function (meal) {
                return meal.categories.indexOf(filter) > -1;
              });

        renderRecipeCards(filtered);
      });
    });

    renderRecipeCards(window.meals);
  }

  document.addEventListener("DOMContentLoaded", setupFilters);
})();
