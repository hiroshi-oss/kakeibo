const SUPABASE_URL = "https://nrhahsoxsdabqsdzexyk.supabase.co";
const SUPABASE_KEY = "sb_publishable_szpBxayLcqMjZ2SlPnH-fA_cY8yoHjJ";

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

let records = [];
let sortedRecords = [];
let expenseChart;

let selectedYear;
let selectedMonth;

let now = new Date();

selectedYear = now.getFullYear();
selectedMonth = now.getMonth() + 1;


async function loadSupabaseRecords() {
    const { data, error } =
        await supabaseClient
            .from("records")
            .select("*")
            .order("date", {
                ascending: false
            })
            .order("created_at", {
                ascending: false
            });

    if (error) {
        console.log(
            "読み込みエラー:",
            error
        );
        return;
    }

    records = data || [];

    sortedRecords =
        records.map(
            function(record, index) {
                return {
                    record: record,
                    index: index
                };
            }
        );

    showSelectedMonth();
}


async function addMoney() {
    let item =
        document.getElementById("item").value;

    let amount =
        document.getElementById("amount").value;

    let type =
        document.getElementById("type").value;

    let date =
        document.getElementById("date").value;

    let category =
        document.getElementById("category").value;

    if (
        item === "" ||
        amount === "" ||
        date === ""
    ) {
        alert(
            "項目・金額・日付を入力してください"
        );
        return;
    }

    const {
        data: { user }
    } =
        await supabaseClient.auth.getUser();

    if (!user) {
        alert("先にログインしてください");
        return;
    }

    let record = {
        item: item,
        amount: Number(amount),
        type: type,
        date: date,
        category: category,
        user_id: user.id
    };

    const { error } =
        await supabaseClient
            .from("records")
            .insert([record]);

    if (error) {
        console.log(
            "保存エラー:",
            error
        );

        alert("保存に失敗しました");
        return;
    }

    document
        .getElementById("item")
        .value = "";

    document
        .getElementById("amount")
        .value = "";

    document
        .getElementById("type")
        .value = "expense";

    await loadSupabaseRecords();
}


async function deleteRecord(id) {
    const { error } =
        await supabaseClient
            .from("records")
            .delete()
            .eq("id", id);

    if (error) {
        console.log(
            "削除エラー:",
            error
        );

        alert("削除に失敗しました");
        return;
    }

    await loadSupabaseRecords();
}


function getBudgetKey(
    year,
    month
) {
    return (
        "budget-" +
        year +
        "-" +
        String(month).padStart(
            2,
            "0"
        )
    );
}


function saveBudget() {
    let budget =
        Number(
            document
                .getElementById(
                    "budget"
                )
                .value
        );

    if (budget <= 0) {
        alert(
            "予算を入力してください"
        );
        return;
    }

    let budgetKey =
        getBudgetKey(
            selectedYear,
            selectedMonth
        );

    localStorage.setItem(
        budgetKey,
        budget
    );

    showSelectedMonth();
}


function showBudget(
    monthExpense
) {
    let budgetKey =
        getBudgetKey(
            selectedYear,
            selectedMonth
        );

    let budget =
        Number(
            localStorage.getItem(
                budgetKey
            )
        ) || 0;

    let budgetInput =
        document.getElementById(
            "budget"
        );

    budgetInput.value =
        budget === 0
            ? ""
            : budget;

    let budgetResult =
        document.getElementById(
            "budgetResult"
        );

    if (!budgetResult) {
        return;
    }

    if (budget === 0) {
        budgetResult.textContent =
            "予算はまだ設定されていません";

        return;
    }

    let remaining =
        budget - monthExpense;

    if (remaining >= 0) {
        budgetResult.textContent =
            "予算：" +
            budget.toLocaleString() +
            "円　あと使える金額：" +
            remaining.toLocaleString() +
            "円";
    } else {
        budgetResult.textContent =
            "予算：" +
            budget.toLocaleString() +
            "円　⚠️ " +
            Math.abs(
                remaining
            ).toLocaleString() +
            "円オーバーしています";
    }
}


function showRecord(
    record,
    index
) {
    let displayDate = "";

    if (record.date) {
        let dateParts =
            record.date.split("-");

        displayDate =
            Number(dateParts[1]) +
            "月" +
            Number(dateParts[2]) +
            "日";
    }

    let li =
        document.createElement(
            "li"
        );

    if (
        record.type === "income"
    ) {
        li.classList.add(
            "income"
        );

        li.textContent =
            displayDate +
            "　" +
            record.item +
            "：" +
            Number(
                record.amount
            ).toLocaleString() +
            "円（収入・" +
            (
                record.category ||
                "その他"
            ) +
            "）";
    } else {
        li.classList.add(
            "expense"
        );

        li.textContent =
            displayDate +
            "　" +
            record.item +
            "：" +
            Number(
                record.amount
            ).toLocaleString() +
            "円（支出・" +
            (
                record.category ||
                "その他"
            ) +
            "）";
    }

    let deleteButton =
        document.createElement(
            "button"
        );

    deleteButton.textContent =
        "削除";

    deleteButton.onclick =
        async function() {
            await deleteRecord(
                record.id
            );
        };

    li.appendChild(
        deleteButton
    );

    document
        .getElementById("list")
        .appendChild(li);
}


function updateChart(
    categoryTotals
) {
    let canvas =
        document.getElementById(
            "expenseChart"
        );

    if (!canvas) {
        return;
    }

    if (expenseChart) {
        expenseChart.destroy();
    }

    expenseChart =
        new Chart(
            canvas,
            {
                type: "pie",

                data: {
                    labels: [
                        "食費",
                        "交通費",
                        "日用品",
                        "娯楽",
                        "その他"
                    ],

                    datasets: [{
                        data: [
                            categoryTotals[
                                "食費"
                            ],
                            categoryTotals[
                                "交通費"
                            ],
                            categoryTotals[
                                "日用品"
                            ],
                            categoryTotals[
                                "娯楽"
                            ],
                            categoryTotals[
                                "その他"
                            ]
                        ],

                        backgroundColor: [
                            "#ff6384",
                            "#36a2eb",
                            "#ffcd56",
                            "#4bc0c0",
                            "#9966ff"
                        ]
                    }]
                }
            }
        );
}


function showSelectedMonth() {
    let monthText =
        selectedYear +
        "-" +
        String(
            selectedMonth
        ).padStart(
            2,
            "0"
        );

    document
        .getElementById(
            "currentMonthLabel"
        )
        .textContent =
        selectedYear +
        "年" +
        selectedMonth +
        "月";

    document
        .getElementById("list")
        .innerHTML = "";

    let monthIncome = 0;
    let monthExpense = 0;
    let recordCount = 0;

    let categoryTotals = {
        "食費": 0,
        "交通費": 0,
        "日用品": 0,
        "娯楽": 0,
        "その他": 0
    };

    sortedRecords.forEach(
        function(item) {
            if (
                item.record.date &&
                item.record.date.startsWith(
                    monthText
                )
            ) {
                showRecord(
                    item.record,
                    item.index
                );

                recordCount++;

                if (
                    item.record.type ===
                    "income"
                ) {
                    monthIncome +=
                        Number(
                            item.record.amount
                        );
                } else {
                    monthExpense +=
                        Number(
                            item.record.amount
                        );

                    let category =
                        item.record.category ||
                        "その他";

                    if (
                        categoryTotals[
                            category
                        ] === undefined
                    ) {
                        category =
                            "その他";
                    }

                    categoryTotals[
                        category
                    ] +=
                        Number(
                            item.record.amount
                        );
                }
            }
        }
    );

    if (recordCount === 0) {
        let li =
            document.createElement(
                "li"
            );

        li.textContent =
            "この月の記録はありません";

        document
            .getElementById(
                "list"
            )
            .appendChild(li);
    }

    let monthBalance =
        monthIncome -
        monthExpense;

    document
        .getElementById(
            "incomeResult"
        )
        .textContent =
        "収入合計：" +
        monthIncome.toLocaleString() +
        "円";

    document
        .getElementById(
            "expenseResult"
        )
        .textContent =
        "支出合計：" +
        monthExpense.toLocaleString() +
        "円";

    document
        .getElementById(
            "balanceResult"
        )
        .textContent =
        "残高：" +
        monthBalance.toLocaleString() +
        "円";

    let categorySummary =
        document.getElementById(
            "categorySummary"
        );

    categorySummary.innerHTML =
        "";

    for (
        let category
        in categoryTotals
    ) {
        let p =
            document.createElement(
                "p"
            );

        p.textContent =
            category +
            "：" +
            categoryTotals[
                category
            ].toLocaleString() +
            "円";

        categorySummary
            .appendChild(p);
    }

    showBudget(
        monthExpense
    );

    updateChart(
        categoryTotals
    );
}


document
    .getElementById("item")
    .addEventListener(
        "keydown",
        function(event) {
            if (
                event.key ===
                "Enter"
            ) {
                document
                    .getElementById(
                        "amount"
                    )
                    .focus();
            }
        }
    );


document
    .getElementById("amount")
    .addEventListener(
        "keydown",
        function(event) {
            if (
                event.key ===
                "Enter"
            ) {
                document
                    .getElementById(
                        "category"
                    )
                    .focus();
            }
        }
    );


document
    .getElementById("category")
    .addEventListener(
        "keydown",
        function(event) {
            if (
                event.key ===
                "Enter"
            ) {
                document
                    .getElementById(
                        "type"
                    )
                    .focus();
            }
        }
    );


document
    .getElementById("type")
    .addEventListener(
        "keydown",
        function(event) {
            if (
                event.key ===
                "Enter"
            ) {
                addMoney();
            }
        }
    );


document
    .getElementById(
        "saveBudgetButton"
    )
    .addEventListener(
        "click",
        saveBudget
    );


document
    .getElementById(
        "prevMonthButton"
    )
    .addEventListener(
        "click",
        function() {
            selectedMonth--;

            if (
                selectedMonth === 0
            ) {
                selectedMonth = 12;
                selectedYear--;
            }

            showSelectedMonth();
        }
    );


document
    .getElementById(
        "nextMonthButton"
    )
    .addEventListener(
        "click",
        function() {
            selectedMonth++;

            if (
                selectedMonth === 13
            ) {
                selectedMonth = 1;
                selectedYear++;
            }

            showSelectedMonth();
        }
    );


document
    .getElementById(
        "showAllButton"
    )
    .addEventListener(
        "click",
        function() {
            document
                .getElementById(
                    "list"
                )
                .innerHTML = "";

            sortedRecords.forEach(
                function(item) {
                    showRecord(
                        item.record,
                        item.index
                    );
                }
            );
        }
    );


document
    .getElementById(
        "loginButton"
    )
    .addEventListener(
        "click",
        async function() {
            let email =
                document
                    .getElementById(
                        "loginEmail"
                    )
                    .value;

            let password =
                document
                    .getElementById(
                        "loginPassword"
                    )
                    .value;

            const {
                error
            } =
                await supabaseClient
                    .auth
                    .signInWithPassword({
                        email: email,
                        password: password
                    });

            let loginStatus =
                document.getElementById(
                    "loginStatus"
                );

            if (error) {
                loginStatus.textContent =
                    "ログインに失敗しました";

                return;
            }

            loginStatus.textContent =
                "ログインしました";

            await loadSupabaseRecords();
        }
    );


window.onload =
    async function() {
        document
            .getElementById(
                "item"
            )
            .focus();

        let today =
            new Date();

        let year =
            today.getFullYear();

        let month =
            String(
                today.getMonth() + 1
            ).padStart(
                2,
                "0"
            );

        let day =
            String(
                today.getDate()
            ).padStart(
                2,
                "0"
            );

        document
            .getElementById(
                "date"
            )
            .value =
            year +
            "-" +
            month +
            "-" +
            day;

        const {
            data: {
                session
            }
        } =
            await supabaseClient
                .auth
                .getSession();

        if (session) {
            document
                .getElementById(
                    "loginStatus"
                )
                .textContent =
                "ログイン済み";

            await loadSupabaseRecords();
        } else {
            showSelectedMonth();
        }
    };