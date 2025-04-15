document.addEventListener('DOMContentLoaded', () => {
    // --- SELECCIÓN DE ELEMENTOS DEL DOM ---
    const itemGrid = document.querySelector('.items-grid');
    const billItemsList = document.querySelector('.bill-items');
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total');
    const categoryButtonsContainer = document.querySelector('.categories');
    const allItemCards = document.querySelectorAll('.item-card');
    const menuTitle = document.getElementById('menu-title');
    const checkoutButton = document.querySelector('.checkout-btn');
    const clearBillButton = document.querySelector('.clear-bill-btn'); // Botón Borrar Cuenta

    // --- ESTADO DE LA APLICACIÓN ---
    let currentBill = {}; // Objeto para almacenar los items de la cuenta actual { itemId: { name, price, quantity } }
    const CURRENCY_SYMBOL = '€'; // Símbolo de moneda a utilizar

    // --- FILTRADO POR CATEGORÍA ---
    if (categoryButtonsContainer) {
        categoryButtonsContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('category')) {
                const selectedCategory = event.target.dataset.category;
                // Actualizar botón activo
                categoryButtonsContainer.querySelectorAll('.category').forEach(btn => {
                    btn.classList.remove('active');
                });
                event.target.classList.add('active');
                // Actualizar título del menú
                if (menuTitle) {
                   menuTitle.textContent = selectedCategory === 'all' ? 'Todos los Productos' : event.target.textContent.trim();
                }
                // Aplicar filtro
                filterItems(selectedCategory);
            }
        });
    }

    /**
     * Muestra u oculta los items según la categoría seleccionada.
     * @param {string} category - La categoría a mostrar ('all' para todas).
     */
    function filterItems(category) {
        allItemCards.forEach(card => {
            const itemCategory = card.dataset.category;
            if (category === 'all' || itemCategory === category) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // --- GESTIÓN DE LA CUENTA (AÑADIR/MODIFICAR ITEMS) ---
    if (itemGrid) {
        itemGrid.addEventListener('click', (event) => {
            if (event.target.classList.contains('add-btn')) {
                const button = event.target;
                const id = button.dataset.id;
                const name = button.dataset.name;
                const price = parseFloat(button.dataset.price);
                addItemToBill(id, name, price);
            }
        });
    }

    if (billItemsList) {
         billItemsList.addEventListener('click', (event) => {
            const target = event.target;
            const listItem = target.closest('li');
            if (!listItem) return;
            const id = listItem.dataset.id;

            if (target.classList.contains('increase-qty')) {
                 if (currentBill[id]) currentBill[id].quantity++;
            } else if (target.classList.contains('decrease-qty')) {
                 if (currentBill[id]) {
                    currentBill[id].quantity--;
                    if (currentBill[id].quantity <= 0) delete currentBill[id];
                 }
            } else if (target.classList.contains('remove-item')) {
                // Eliminar item si se hace clic en el botón 'x'
                 if (currentBill[id]) delete currentBill[id];
            }
            renderBill(); // Actualizar la vista de la cuenta
         });
    }

    /**
     * Añade un item a la cuenta o incrementa su cantidad si ya existe.
     * @param {string} id - ID único del producto.
     * @param {string} name - Nombre del producto.
     * @param {number} price - Precio del producto.
     */
    function addItemToBill(id, name, price) {
        if (currentBill[id]) {
            currentBill[id].quantity++;
        } else {
            currentBill[id] = { name, price, quantity: 1 };
        }
        renderBill();
    }

    /**
     * Actualiza la sección de la cuenta en el HTML para reflejar el estado de `currentBill`.
     */
    function renderBill() {
        if (!billItemsList) return;

        billItemsList.innerHTML = ''; // Limpiar lista
        let subtotal = 0;

        // Ordenar items alfabéticamente (opcional, puedes quitar esto si no lo quieres)
        const sortedItemIds = Object.keys(currentBill).sort((a, b) =>
            currentBill[a].name.localeCompare(currentBill[b].name)
        );

        // Dibujar cada item en la lista
        for (const id of sortedItemIds) {
            const item = currentBill[id];
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;

            const li = document.createElement('li');
            li.dataset.id = id;
            li.innerHTML = `
                <span class="item-name">${item.name}</span>
                <span class="quantity">
                    <button class="qty-btn decrease-qty" title="Disminuir">-</button>
                     ${item.quantity}
                    <button class="qty-btn increase-qty" title="Aumentar">+</button>
                </span>
                <span class="item-price">${CURRENCY_SYMBOL}${itemTotal.toFixed(2)}</span>
                <button class="remove-item" title="Eliminar">&times;</button>
            `;
            billItemsList.appendChild(li);
        }

        // Calcular total (sin IVA)
        const total = subtotal;

        // Actualizar resumen en el HTML
        if (subtotalEl) subtotalEl.textContent = `${CURRENCY_SYMBOL}${subtotal.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `${CURRENCY_SYMBOL}${total.toFixed(2)}`;
    }

    // --- FUNCIONALIDAD DEL BOTÓN COBRAR (COPIAR NÚMERO ENTERO) ---
    if (checkoutButton && totalEl) {
        checkoutButton.addEventListener('click', () => {
            const totalValueText = totalEl.textContent;
            const totalValueNumeric = parseFloat(totalValueText.replace(CURRENCY_SYMBOL, ''));

            // Evitar copiar si total es 0 o inválido
            if (totalValueNumeric <= 0 || !totalValueNumeric) {
                console.log("La cuenta está vacía, nada que copiar.");
                return;
            }

            // Obtener solo la parte entera
            const integerValue = Math.floor(totalValueNumeric);
            const valueToCopy = integerValue.toString(); // Convertir a texto

            // Copiar al portapapeles
            navigator.clipboard.writeText(valueToCopy)
                .then(() => {
                    // Feedback de éxito
                    console.log(`Número entero "${valueToCopy}" copiado al portapapeles.`);
                    const originalButtonText = checkoutButton.textContent;
                    checkoutButton.textContent = '¡Número Copiado!';
                    checkoutButton.disabled = true; // Deshabilitar botón temporalmente
                    setTimeout(() => {
                        checkoutButton.textContent = originalButtonText;
                        checkoutButton.disabled = false; // Rehabilitar
                    }, 1500); // 1.5 segundos
                })
                .catch(err => {
                    // Feedback de error
                    console.error('Error al intentar copiar al portapapeles: ', err);
                    alert('Error al copiar el número. Revisa la consola o los permisos del navegador.');
                });
        });
    }

    // --- FUNCIONALIDAD DEL BOTÓN BORRAR CUENTA ---
    if (clearBillButton) {
        clearBillButton.addEventListener('click', () => {
            // No hacer nada si la cuenta ya está vacía
            if (Object.keys(currentBill).length === 0) {
                console.log("La cuenta ya está vacía.");
                return;
            }
            // Pedir confirmación
            if (confirm('¿Estás seguro de que quieres borrar la cuenta actual? Esta acción no se puede deshacer.')) {
                currentBill = {}; // Vaciar datos de la cuenta
                renderBill();     // Actualizar la vista
                console.log("Cuenta borrada exitosamente.");
            } else {
                console.log("Borrado de cuenta cancelado.");
            }
        });
    }

    // --- INICIALIZACIÓN AL CARGAR LA PÁGINA ---
    filterItems('all'); // Mostrar todos los productos al inicio
    renderBill();      // Renderizar la cuenta (inicialmente vacía)

}); // Fin del DOMContentLoaded