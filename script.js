document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const transactionForm = document.getElementById('transaction-form');
    const transactionModal = document.getElementById('transaction-modal');
    const aiModal = document.getElementById('ai-modal');
    const addTransactionBtn = document.getElementById('add-transaction-btn');
    const analyzeSpendingBtn = document.getElementById('analyze-spending-btn');
    const savingsSuggestionsBtn = document.getElementById('savings-suggestions-btn');
    const transactionsList = document.getElementById('transactions-list');
    const currentMonthEl = document.getElementById('current-month');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const totalBalanceEl = document.getElementById('total-balance');
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpensesEl = document.getElementById('total-expenses');
    const financeChartCanvas = document.getElementById('finance-chart');
    const financeChartCtx = financeChartCanvas ? financeChartCanvas.getContext('2d') : null;

    // State
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();
    let financeChart;

    // Initialize the app
    init();

    function init() {
        updateMonthDisplay();
        renderTransactions();
        updateSummary();
        renderChart();
        setupEventListeners();
    }

    function setupEventListeners() {
        if (transactionForm) {
            transactionForm.addEventListener('submit', handleTransactionSubmit);
        }

        addTransactionBtn?.addEventListener('click', () => openTransactionModal());

        document.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', closeModals));

        document.getElementById('cancel-transaction')?.addEventListener('click', closeModals);
        document.getElementById('ai-cancel-btn')?.addEventListener('click', closeModals);

        analyzeSpendingBtn?.addEventListener('click', analyzeSpendingWithAI);
        savingsSuggestionsBtn?.addEventListener('click', generateSavingsSuggestions);

        prevMonthBtn?.addEventListener('click', () => {
            if (currentMonth === 0) {
                currentMonth = 11;
                currentYear--;
            } else {
                currentMonth--;
            }
            updateMonthDisplay();
            renderTransactions();
            updateSummary();
            renderChart();
        });

        nextMonthBtn?.addEventListener('click', () => {
            if (currentMonth === 11) {
                currentMonth = 0;
                currentYear++;
            } else {
                currentMonth++;
            }
            updateMonthDisplay();
            renderTransactions();
            updateSummary();
            renderChart();
        });

        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderTransactions();
            });
        });
    }

    function updateMonthDisplay() {
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
        currentMonthEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    }

    function openTransactionModal(transaction = null) {
        document.getElementById('modal-title').textContent = transaction ? "Edit Transaction" : "Add Transaction";

        if (transaction) {
            document.getElementById('transaction-type').value = transaction.type;
            document.getElementById('transaction-amount').value = transaction.amount;
            document.getElementById('transaction-category').value = transaction.category;
            document.getElementById('transaction-description').value = transaction.description || '';
            document.getElementById('transaction-date').value = transaction.date;
        } else {
            transactionForm.reset();
            document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
        }

        transactionModal.style.display = 'block';
    }

    function handleTransactionSubmit(e) {
        e.preventDefault();

        const type = document.getElementById('transaction-type').value;
        const amount = parseFloat(document.getElementById('transaction-amount').value);
        const category = document.getElementById('transaction-category').value;
        const description = document.getElementById('transaction-description').value;
        const date = document.getElementById('transaction-date').value;

        const transaction = {
            id: Date.now().toString(),
            type,
            amount,
            category,
            description,
            date,
            createdAt: new Date().toISOString()
        };

        transactions.push(transaction);
        saveTransactions();
        renderTransactions();
        updateSummary();
        renderChart();
        closeModals();
    }

    function saveTransactions() {
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }

    function renderTransactions() {
        const activeCategoryBtn = document.querySelector('.category-btn.active');
        const activeCategory = activeCategoryBtn?.dataset.category || 'all';

        const filteredTransactions = transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            const matchesMonthYear = transactionDate.getMonth() === currentMonth &&
                transactionDate.getFullYear() === currentYear;

            const matchesCategory = activeCategory === 'all' ||
                transaction.category === activeCategory ||
                (activeCategory === 'income' && transaction.type === 'income');

            return matchesMonthYear && matchesCategory;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));

        transactionsList.innerHTML = '';

        if (filteredTransactions.length === 0) {
            transactionsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-coins"></i>
                    <p>No transactions found.</p>
                </div>
            `;
            return;
        }

        filteredTransactions.forEach(transaction => {
            const transactionEl = document.createElement('div');
            transactionEl.className = 'transaction-item';

            transactionEl.innerHTML = `
                <div class="transaction-info">
                    <h4>${transaction.description || transaction.category}</h4>
                    <p class="transaction-date">${formatDate(transaction.date)}</p>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}$${transaction.amount.toFixed(2)}
                </div>
            `;

            transactionsList.appendChild(transactionEl);
        });
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

    function updateSummary() {
        const monthlyTransactions = transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate.getMonth() === currentMonth &&
                transactionDate.getFullYear() === currentYear;
        });

        const totalIncome = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const balance = totalIncome - totalExpenses;

        totalIncomeEl.textContent = `$${totalIncome.toFixed(2)}`;
        totalExpensesEl.textContent = `$${totalExpenses.toFixed(2)}`;
        totalBalanceEl.textContent = `$${balance.toFixed(2)}`;
    }

    function renderChart() {
        if (!financeChartCtx) return;

        if (financeChart) {
            financeChart.destroy();
        }

        const monthlyTransactions = transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate.getMonth() === currentMonth &&
                transactionDate.getFullYear() === currentYear;
        });

        const categories = {};
        monthlyTransactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                if (!categories[transaction.category]) {
                    categories[transaction.category] = 0;
                }
                categories[transaction.category] += transaction.amount;
            }
        });

        const categoryLabels = Object.keys(categories);
        const categoryData = Object.values(categories);

        financeChart = new Chart(financeChartCtx, {
            type: 'doughnut',
            data: {
                labels: categoryLabels,
                datasets: [{
                    data: categoryData,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56',
                        '#4BC0C0', '#9966FF', '#FF9F40'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `$${context.raw.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    async function analyzeSpendingWithAI() {
        openAiModal('AI Spending Analysis');

        document.getElementById('ai-modal-body').innerHTML = `
            <div class="ai-loading">
                <i class="fas fa-spinner"></i>
                <p>Analyzing your spending patterns...</p>
            </div>
        `;

        try {
            const response = await simulateAIRequest('spending-analysis');

            document.getElementById('ai-modal-body').innerHTML = `
                <div class="ai-response">
                    <h3>Spending Analysis</h3>
                    <p>Based on your transactions in ${currentMonthEl.textContent}:</p>
                    <ul>${response.insights.map(i => `<li>${i}</li>`).join('')}</ul>
                    <h4>Category Breakdown</h4>
                    <ul>${response.categoryTips.map(t => `<li>${t}</li>`).join('')}</ul>
                </div>
            `;
        } catch (error) {
            document.getElementById('ai-modal-body').innerHTML = `
                <div class="ai-response" style="border-left-color: #f44336;">
                    <h3>Error</h3>
                    <p>Failed to analyze spending. Please try again later.</p>
                </div>
            `;
        }
    }

    async function generateSavingsSuggestions() {
        openAiModal('AI Savings Suggestions');

        document.getElementById('ai-modal-body').innerHTML = `
            <div class="ai-loading">
                <i class="fas fa-spinner"></i>
                <p>Generating personalized savings tips...</p>
            </div>
        `;

        try {
            const response = await simulateAIRequest('savings-suggestions');

            document.getElementById('ai-modal-body').innerHTML = `
                <div class="ai-response">
                    <h3>Savings Opportunities</h3>
                    <p>Here are ways you could save more money:</p>
                    <ul>${response.suggestions.map(s => `<li>${s}</li>`).join('')}</ul>
                    <h4>Potential Monthly Savings</h4>
                    <p>By following these suggestions, you could save approximately <strong>$${response.estimatedSavings}</strong> per month.</p>
                </div>
            `;
        } catch (error) {
            document.getElementById('ai-modal-body').innerHTML = `
                <div class="ai-response" style="border-left-color: #f44336;">
                    <h3>Error</h3>
                    <p>Failed to generate savings suggestions. Please try again later.</p>
                </div>
            `;
        }
    }

    function openAiModal(title) {
        document.getElementById('ai-modal-title').textContent = title;
        aiModal.style.display = 'block';
    }

    function simulateAIRequest(type) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const monthlyTransactions = transactions.filter(t => {
                    const date = new Date(t.date);
                    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
                });

                if (type === 'spending-analysis') {
                    const categories = {};
                    monthlyTransactions.forEach(t => {
                        if (t.type === 'expense') {
                            if (!categories[t.category]) categories[t.category] = 0;
                            categories[t.category] += t.amount;
                        }
                    });

                    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];

                    resolve({
                        insights: [
                            `You spent $${topCategory ? topCategory[1].toFixed(2) : '0.00'} on ${topCategory ? topCategory[0] : 'various categories'} this month.`,
                            'Your spending on dining out is 20% higher than last month.',
                            'You have recurring subscriptions costing $45/month.'
                        ],
                        categoryTips: [
                            `Food: Consider meal prepping to reduce $${topCategory ? Math.floor(topCategory[1] * 0.2) : 0} in spending.`,
                            'Entertainment: Look for free community events.',
                            'Shopping: Implement a 24-hour waiting period before purchases.'
                        ]
                    });
                } else if (type === 'savings-suggestions') {
                    resolve({
                        suggestions: [
                            "Cancel unused subscriptions (potential savings: $15/month)",
                            "Reduce dining out by 2 meals/week (save ~$80/month)",
                            "Switch to a cheaper phone plan (save $20/month)",
                            "Use cashback apps for groceries (save 5% per trip)"
                        ],
                        estimatedSavings: "115"
                    });
                }
            }, 1500);
        });
    }

    function closeModals() {
        transactionModal.style.display = 'none';
        aiModal.style.display = 'none';
    }

    window.addEventListener('click', (e) => {
        if (e.target === transactionModal) transactionModal.style.display = 'none';
        if (e.target === aiModal) aiModal.style.display = 'none';
    });
});
