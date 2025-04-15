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
    const clearBillButton = document.querySelector('.clear-bill-btn');
    const historyButton = document.getElementById('history-btn');
    const historySection = document.getElementById('order-history-section');
    const historyList = document.getElementById('history-list');
    const clearHistoryButton = document.getElementById('clear-history-btn');

    // --- ESTADO DE LA APLICACIÓN ---
    let currentBill = {};
    const CURRENCY_SYMBOL = '€'; // Símbolo para mostrar precios en la UI
    const HISTORY_STORAGE_KEY = 'atomPosOrderHistory';

    // --- FUNCIONES AUXILIARES LOCALSTORAGE ---
    function getOrderHistory() {
        const historyJson = localStorage.getItem(HISTORY_STORAGE_KEY);
        try {
            return historyJson ? JSON.parse(historyJson) : [];
        } catch (error) {
            console.error("Error al leer el historial de localStorage:", error);
            return [];
        }
    }

    function saveOrderToHistory(order) {
        try {
            const history = getOrderHistory();
            // Limitar tamaño historial (opcional) - ej: mantener últimos 100 pedidos
            // while (history.length >= 100) {
            //     history.shift(); // Elimina el pedido más antiguo
            // }
            history.push(order);
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
        } catch (error) {
            console.error("Error al guardar el pedido en localStorage:", error);
            alert("Error: No se pudo guardar el pedido en el historial.");
        }
    }

    function clearOrderHistory() {
        try {
            localStorage.removeItem(HISTORY_STORAGE_KEY);
        } catch (error) {
            console.error("Error al borrar el historial de localStorage:", error);
        }
    }

    // --- FILTRADO POR CATEGORÍA ---
    if (categoryButtonsContainer) {
        categoryButtonsContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('category')) {
                const selectedCategory = event.target.dataset.category;
                categoryButtonsContainer.querySelectorAll('.category').forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                if (menuTitle) menuTitle.textContent = selectedCategory === 'all' ? 'Todos los Productos' : event.target.textContent.trim();
                filterItems(selectedCategory);
            }
        });
    }

    function filterItems(category) {
        allItemCards.forEach(card => {
            const itemCategory = card.dataset.category;
            card.style.display = (category === 'all' || itemCategory === category) ? 'block' : 'none';
        });
    }

    // --- GESTIÓN DE LA CUENTA ACTUAL ---
    if (itemGrid) {
        itemGrid.addEventListener('click', (event) => {
            if (event.target.classList.contains('add-btn')) {
                const button = event.target;
                addItemToBill(button.dataset.id, button.dataset.name, parseFloat(button.dataset.price));
            }
        });
    }

    if (billItemsList) {
         billItemsList.addEventListener('click', (event) => {
            const target = event.target;
            const listItem = target.closest('li');
            if (!listItem) return;
            const id = listItem.dataset.id;
            if (!currentBill[id]) return; // Seguridad: item no existe

            if (target.classList.contains('increase-qty')) {
                 currentBill[id].quantity++;
            } else if (target.classList.contains('decrease-qty')) {
                 currentBill[id].quantity--;
                 if (currentBill[id].quantity <= 0) delete currentBill[id];
            } else if (target.classList.contains('remove-item')) {
                 delete currentBill[id];
            }
            renderBill();
         });
    }

    function addItemToBill(id, name, price) {
        if (currentBill[id]) {
            currentBill[id].quantity++;
        } else {
            currentBill[id] = { name, price, quantity: 1 };
        }
        renderBill();
    }

    // --- RENDERIZADO DE LA CUENTA ACTUAL ---
    function renderBill() {
        if (!billItemsList) return;
        billItemsList.innerHTML = '';
        let subtotal = 0;
        const sortedItemIds = Object.keys(currentBill).sort((a, b) => currentBill[a].name.localeCompare(currentBill[b].name));

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
        const total = subtotal;
        if (subtotalEl) subtotalEl.textContent = `${CURRENCY_SYMBOL}${subtotal.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `${CURRENCY_SYMBOL}${total.toFixed(2)}`;
    }

    // --- RENDERIZADO DEL HISTORIAL ---
    function renderOrderHistory() {
        if (!historyList) return;
        const history = getOrderHistory();
        historyList.innerHTML = ''; // Limpiar

        if (history.length === 0) {
            historyList.innerHTML = '<li>No hay pedidos guardados.</li>';
            if (clearHistoryButton) clearHistoryButton.disabled = true;
            return;
        }
        if (clearHistoryButton) clearHistoryButton.disabled = false;

        history.slice().reverse().forEach(order => {
             if (!order || typeof order !== 'object' || !order.id || !order.timestamp || !order.items || typeof order.total !== 'number') {
                console.warn("Saltando pedido inválido en el historial:", order); return;
            }

            const li = document.createElement('li');
            li.dataset.orderId = order.id;

            let orderDate;
            try { orderDate = new Date(order.timestamp); if (isNaN(orderDate)) throw new Error('Invalid Date'); } catch (e) { orderDate = new Date(); }
            const formattedTimestamp = `${orderDate.toLocaleDateString('es-ES')} ${orderDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

            let itemsString = 'Detalles no disponibles';
            if (order.items && typeof order.items === 'object') {
                const validItems = Object.values(order.items).filter(item => item && item.quantity && item.name);
                if (validItems.length > 0) {
                    itemsString = validItems.map(item => `x${item.quantity} ${item.name}`).join(', ');
                }
            }

            const orderTotalFormatted = `${CURRENCY_SYMBOL}${order.total.toFixed(2)}`;

            li.innerHTML = `
                <div class="history-item-content">
                    <div class="history-item-header">
                        <span class="timestamp">${formattedTimestamp}</span>
                        <span class="order-total">${orderTotalFormatted}</span>
                    </div>
                    <span class="history-item-details">${itemsString}</span>
                </div>
                <button class="copy-history-order-btn" title="Copiar Resumen del Pedido">
                    <i class="fas fa-copy"></i>
                </button>
            `;
            historyList.appendChild(li);
        });
    }

    // --- FUNCIONALIDAD BOTÓN FINALIZAR Y GUARDAR ---
    if (checkoutButton && totalEl) {
        checkoutButton.addEventListener('click', () => {
            const totalValueText = totalEl.textContent;
            const totalValueNumeric = parseFloat(totalValueText.replace(CURRENCY_SYMBOL, ''));

            if (Object.keys(currentBill).length === 0 || totalValueNumeric <= 0 || !totalValueNumeric) {
                alert("La cuenta actual está vacía. Añade productos antes de finalizar."); return;
            }

            const order = {
                id: Date.now(), timestamp: new Date().toISOString(),
                items: JSON.parse(JSON.stringify(currentBill)), total: totalValueNumeric
            };

            saveOrderToHistory(order);
            console.log("Pedido guardado:", order);

            const integerValue = Math.floor(totalValueNumeric);
            const valueToCopy = integerValue.toString();
            navigator.clipboard.writeText(valueToCopy)
                .then(() => {
                    console.log(`Número entero "${valueToCopy}" copiado.`);
                    const originalButtonText = checkoutButton.textContent;
                    checkoutButton.textContent = '¡Guardado y Copiado!';
                    checkoutButton.disabled = true;
                    setTimeout(() => { checkoutButton.textContent = originalButtonText; checkoutButton.disabled = false; }, 1500);
                })
                .catch(err => console.error('Error al copiar: ', err));

            currentBill = {}; renderBill();
            if (historySection && historySection.style.display !== 'none') renderOrderHistory();
            // alert("Pedido finalizado y guardado."); // Opcional
        });
    }

    // --- FUNCIONALIDAD BOTÓN BORRAR CUENTA ACTUAL ---
    if (clearBillButton) {
        clearBillButton.addEventListener('click', () => {
            if (Object.keys(currentBill).length === 0) return;
            if (confirm('¿Borrar la cuenta actual? Los productos se eliminarán.')) {
                currentBill = {}; renderBill(); console.log("Cuenta actual borrada.");
            }
        });
    }

    // --- FUNCIONALIDAD BOTÓN HISTORIAL (Mostrar/Ocultar) ---
    if (historyButton && historySection) {
        historyButton.addEventListener('click', () => {
            const isHidden = historySection.style.display === 'none';
            historySection.style.display = isHidden ? 'block' : 'none';
            if (isHidden) renderOrderHistory();
        });
    }

    // --- FUNCIONALIDAD BOTÓN BORRAR HISTORIAL ---
    if (clearHistoryButton) {
        clearHistoryButton.addEventListener('click', () => {
            const history = getOrderHistory();
            if (history.length === 0) { console.log("El historial ya está vacío."); return; }
            if (confirm('¿Estás seguro de que quieres borrar TODO el historial de pedidos? Esta acción es irreversible.')) {
                clearOrderHistory(); renderOrderHistory(); console.log("Historial de pedidos borrado."); alert("Historial de pedidos borrado.");
            }
        });
    }

    // --- EVENT LISTENER DELEGADO PARA COPIAR PEDIDO DEL HISTORIAL ---
    if (historyList) {
        historyList.addEventListener('click', (event) => {
            const copyButton = event.target.closest('.copy-history-order-btn');
            if (copyButton) {
                const listItem = copyButton.closest('li');
                const orderId = listItem?.dataset.orderId;
                if (!orderId) return;

                const history = getOrderHistory();
                const orderToCopy = history.find(order => order.id === Number(orderId));

                if (orderToCopy) {
                    let itemsText = "ninguno"; // Valor por defecto
                    if (orderToCopy.items && typeof orderToCopy.items === 'object') {
                        const validItems = Object.values(orderToCopy.items).filter(item => item && item.quantity && item.name);
                        if (validItems.length > 0) {
                             // Formato: xQty1 Item1 y xQty2 Item2 y ...
                             itemsText = validItems.map(item => `x${item.quantity} ${item.name}`).join(' y ');
                        }
                    }

                    const totalWithDollar = `${orderToCopy.total.toFixed(0)}$`; // Sin decimales y $
                    const finalTextToCopy = `Ventas: ${itemsText} = ${totalWithDollar}`;

                    navigator.clipboard.writeText(finalTextToCopy)
                        .then(() => {
                            console.log(`Pedido ${orderId} copiado: "${finalTextToCopy}"`);
                            copyButton.classList.add('copied');
                            setTimeout(() => { copyButton.classList.remove('copied'); }, 1500);
                        })
                        .catch(err => { console.error(`Error al copiar pedido ${orderId}:`, err); alert("Error al copiar el resumen del pedido."); });
                } else {
                    console.error("No se encontró el pedido con ID:", orderId);
                }
            }
        });
    }

    // --- INICIALIZACIÓN AL CARGAR LA PÁGINA ---
    filterItems('all');
    renderBill();
    renderOrderHistory(); // Renderizar historial para estado inicial botón borrar

}); // Fin del DOMContentLoaded