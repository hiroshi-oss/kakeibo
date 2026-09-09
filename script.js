const SUPABASE_URL = "https://nrhahsoxsdabqsdzexyk.supabase.co";
const SUPABASE_KEY = "sb_publishable_szpBxayLcqMjZ2SlPnH-fA_cY8yoHjJ";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let records = [];
let fixedCosts = [];

let now = new Date();
let selectedYear = now.getFullYear();
let selectedMonth = now.getMonth() + 1;

function hideLoginArea() {
    const loginArea = document.getElementById("loginArea");

    if (loginArea) {
        loginArea.style.display = "none";
    }
}

function showLoginArea() {
    const loginArea = document.getElementById("loginArea");

    if (loginArea) {
        loginArea.style.display = "block";
    }
}

async function getCurrentUser() {
    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    return user;
}

async function loadSupabaseRecords() {
    const { data, error } = await supabaseClient
        .from("records")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) {
        console.log("記録読み込みエラー:", error);
        return;
    }

    records = data || [];

    await showSelectedMonth();
    updateMonthlyChart();
}

async function loadFixedCosts() {
    const user = await getCurrentUser();

    if (!user) {
        fixedCosts = [];
        showFixedCosts();
        updateMonthlyChart();
        return;
    }

    const { data, error } = await supabaseClient
        .from("fixed_costs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.log("固定費読み込みエラー:", error);
        return;
    }

    fixedCosts = data || [];

    showFixedCosts();
    updateMonthlyChart();
}

async function addMoney() {
    const item = document
        .getElementById("item")
        .value
        .trim();

    const amount = document.getElementById("amount").value;
    const type = document.getElementById("type").value;
    const date = document.getElementById("date").value;
    const category = document.getElementById("category").value;

    if (
        item === "" ||
        amount === "" ||
        date === ""
    ) {
        alert("項目・金額・日付を入力してください");
        return;
    }

    const user = await getCurrentUser();

    if (!user) {
        alert("先にログインしてください");
        return;
    }

    const { error } = await supabaseClient
        .from("records")
        .insert([
            {
                item: item,
                amount: Number(amount),
                type: type,
                date: date,
                category: category,
                user_id: user.id
            }
        ]);

    if (error) {
        console.log("保存エラー:", error);
        alert("保存に失敗しました");
        return;
    }

    document.getElementById("item").value = "";
    document.getElementById("amount").value = "";
    document.getElementById("type").value = "expense";

    document.getElementById("item").focus();

    await loadSupabaseRecords();
}

async function deleteRecord(id) {
    const { error } = await supabaseClient
        .from("records")
        .delete()
        .eq("id", id);

    if (error) {
        console.log("削除エラー:", error);
        alert("削除に失敗しました");
        return;
    }

    await loadSupabaseRecords();
}

async function addFixedCost() {
    const item = document
        .getElementById("fixedCostItem")
        .value
        .trim();

    const amount = Number(
        document.getElementById("fixedCostAmount").value
    );

    const category = document
        .getElementById("fixedCostCategory")
        .value;

    if (
        item === "" ||
        amount <= 0
    ) {
        alert("固定費の名前と金額を入力してください");
        return;
    }

    const user = await getCurrentUser();

    if (!user) {
        alert("先にログインしてください");
        return;
    }

    const { error } = await supabaseClient
        .from("fixed_costs")
        .insert([
            {
                item: item,
                amount: amount,
                category: category,
                user_id: user.id
            }
        ]);

    if (error) {
        console.log("固定費保存エラー:", error);
        alert("固定費の保存に失敗しました");
        return;
    }

    document.getElementById("fixedCostItem").value = "";
    document.getElementById("fixedCostAmount").value = "";

    await loadFixedCosts();
    await showSelectedMonth();
}

async function deleteFixedCost(id) {
    const { error } = await supabaseClient
        .from("fixed_costs")
        .delete()
        .eq("id", id);

    if (error) {
        console.log("固定費削除エラー:", error);
        alert("固定費の削除に失敗しました");
        return;
    }

    await loadFixedCosts();
    await showSelectedMonth();
}

function showFixedCosts() {
    const list = document.getElementById("fixedCostList");
    const summary = document.getElementById("fixedCostSummary");

    list.innerHTML = "";

    let total = 0;

    if (fixedCosts.length === 0) {
        const li = document.createElement("li");

        li.textContent = "固定費はまだ登録されていません";

        list.appendChild(li);

        summary.textContent = "固定費合計：0円";

        return;
    }

    fixedCosts.forEach(function(fixedCost) {
        total += Number(fixedCost.amount);

        const li = document.createElement("li");

        const text = document.createElement("span");

        text.textContent =
            fixedCost.item +
            "：" +
            Number(fixedCost.amount).toLocaleString() +
            "円（" +
            (fixedCost.category || "その他") +
            "）";

        const deleteButton = document.createElement("button");

        deleteButton.textContent = "削除";

        deleteButton.onclick = async function() {
            await deleteFixedCost(fixedCost.id);
        };

        li.appendChild(text);
        li.appendChild(deleteButton);

        list.appendChild(li);
    });

    summary.textContent =
        "固定費合計：" +
        total.toLocaleString() +
        "円";
}

async function saveBudget() {
    const budget = Number(
        document.getElementById("budget").value
    );

    if (budget <= 0) {
        alert("予算を入力してください");
        return;
    }

    const user = await getCurrentUser();

    if (!user) {
        alert("先にログインしてください");
        return;
    }

    const {
        data: existingBudget,
        error: selectError
    } = await supabaseClient
        .from("budgets")
        .select("*")
        .eq("user_id", user.id)
        .eq("year", selectedYear)
        .eq("month", selectedMonth)
        .maybeSingle();

    if (selectError) {
        console.log("予算確認エラー:", selectError);
        alert("予算の確認に失敗しました");
        return;
    }

    if (existingBudget) {
        const { error } = await supabaseClient
            .from("budgets")
            .update({
                budget: budget
            })
            .eq("id", existingBudget.id);

        if (error) {
            console.log("予算更新エラー:", error);
            alert("予算の更新に失敗しました");
            return;
        }
    } else {
        const { error } = await supabaseClient
            .from("budgets")
            .insert([
                {
                    user_id: user.id,
                    year: selectedYear,
                    month: selectedMonth,
                    budget: budget
                }
            ]);

        if (error) {
            console.log("予算保存エラー:", error);
            alert("予算の保存に失敗しました");
            return;
        }
    }

    await showSelectedMonth();
}

async function showBudget(monthExpense) {
    const user = await getCurrentUser();

    const budgetInput =
        document.getElementById("budget");

    const budgetResult =
        document.getElementById("budgetResult");

    if (!user) {
        budgetInput.value = "";

        budgetResult.textContent =
            "ログインすると予算を表示できます";

        return;
    }

    const { data, error } = await supabaseClient
        .from("budgets")
        .select("budget")
        .eq("user_id", user.id)
        .eq("year", selectedYear)
        .eq("month", selectedMonth)
        .maybeSingle();

    if (error) {
        console.log("予算読み込みエラー:", error);

        budgetResult.textContent =
            "予算の読み込みに失敗しました";

        return;
    }

    const budget =
        data
            ? Number(data.budget)
            : 0;

    budgetInput.value =
        budget === 0
            ? ""
            : budget;

    if (budget === 0) {
        budgetResult.textContent =
            "予算はまだ設定されていません";

        return;
    }

    const remaining =
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
            Math.abs(remaining).toLocaleString() +
            "円オーバーしています";
    }
}

function showRecord(record) {
    let displayDate = "";

    if (record.date) {
        const dateParts = record.date.split("-");

        displayDate =
            Number(dateParts[1]) +
            "月" +
            Number(dateParts[2]) +
            "日";
    }

    const li = document.createElement("li");
    const text = document.createElement("span");

    if (record.type === "income") {
        li.classList.add("income");

        text.textContent =
            displayDate +
            "　" +
            record.item +
            "：" +
            Number(record.amount).toLocaleString() +
            "円（収入・" +
            (record.category || "その他") +
            "）";
    } else {
        li.classList.add("expense");

        text.textContent =
            displayDate +
            "　" +
            record.item +
            "：" +
            Number(record.amount).toLocaleString() +
            "円（支出・" +
            (record.category || "その他") +
            "）";
    }

    const deleteButton =
        document.createElement("button");

    deleteButton.textContent = "削除";

    deleteButton.onclick = async function() {
        await deleteRecord(record.id);
    };

    li.appendChild(text);
    li.appendChild(deleteButton);

    document
        .getElementById("list")
        .appendChild(li);
}

function prepareCanvas(canvas) {
    const width =
        canvas.clientWidth || 350;

    const height =
        canvas.clientHeight || 300;

    const scale =
        window.devicePixelRatio || 1;

    canvas.width =
        Math.round(width * scale);

    canvas.height =
        Math.round(height * scale);

    const ctx =
        canvas.getContext("2d");

    ctx.setTransform(
        scale,
        0,
        0,
        scale,
        0,
        0
    );

    ctx.clearRect(
        0,
        0,
        width,
        height
    );

    return {
        ctx: ctx,
        width: width,
        height: height
    };
}

function updateChart(categoryTotals) {
    const canvas =
        document.getElementById("expenseChart");

    if (!canvas) {
        return;
    }

    const prepared =
        prepareCanvas(canvas);

    const ctx = prepared.ctx;
    const width = prepared.width;
    const height = prepared.height;

    const categories = [
        "食費",
        "交通費",
        "日用品",
        "娯楽",
        "その他"
    ];

    const colors = [
        "#ff6384",
        "#36a2eb",
        "#ffcd56",
        "#4bc0c0",
        "#9966ff"
    ];

    const values =
        categories.map(function(category) {
            return Number(
                categoryTotals[category] || 0
            );
        });

    const total =
        values.reduce(function(sum, value) {
            return sum + value;
        }, 0);

    if (total === 0) {
        ctx.fillStyle = "#666666";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";

        ctx.fillText(
            "支出データがありません",
            width / 2,
            height / 2
        );

        return;
    }

    const radius =
        Math.min(width, height) * 0.28;

    const centerX =
        width / 2;

    const centerY =
        height * 0.42;

    let startAngle =
        -Math.PI / 2;

    values.forEach(function(value, index) {
        if (value <= 0) {
            return;
        }

        const angle =
            value / total *
            Math.PI *
            2;

        ctx.beginPath();

        ctx.moveTo(
            centerX,
            centerY
        );

        ctx.arc(
            centerX,
            centerY,
            radius,
            startAngle,
            startAngle + angle
        );

        ctx.closePath();

        ctx.fillStyle =
            colors[index];

        ctx.fill();

        startAngle += angle;
    });

    const legendY =
        height * 0.78;

    ctx.font =
        "13px sans-serif";

    ctx.textAlign =
        "left";

    categories.forEach(function(category, index) {
        const row =
            Math.floor(index / 3);

        const column =
            index % 3;

        const x =
            10 +
            column *
            Math.max(100, width / 3);

        const y =
            legendY +
            row * 24;

        ctx.fillStyle =
            colors[index];

        ctx.fillRect(
            x,
            y - 11,
            12,
            12
        );

        ctx.fillStyle =
            "#333333";

        ctx.fillText(
            category,
            x + 18,
            y
        );
    });
}

function updateMonthlyChart() {
    const canvas =
        document.getElementById("monthlyChart");

    if (!canvas) {
        return;
    }

    const monthlyData = {};

    records.forEach(function(record) {
        if (!record.date) {
            return;
        }

        const monthKey =
            record.date.substring(0, 7);

        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                income: 0,
                expense: 0
            };
        }

        if (record.type === "income") {
            monthlyData[monthKey].income +=
                Number(record.amount);
        } else {
            monthlyData[monthKey].expense +=
                Number(record.amount);
        }
    });

    const months =
        Object.keys(monthlyData).sort();

    months.forEach(function(monthKey) {
        fixedCosts.forEach(function(fixedCost) {
            monthlyData[monthKey].expense +=
                Number(fixedCost.amount);
        });
    });

    const prepared =
        prepareCanvas(canvas);

    const ctx = prepared.ctx;
    const width = prepared.width;
    const height = prepared.height;

    if (months.length === 0) {
        ctx.fillStyle = "#666666";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";

        ctx.fillText(
            "月ごとのデータがありません",
            width / 2,
            height / 2
        );

        return;
    }

    const visibleMonths =
        months.slice(-6);

    let maxValue = 0;

    visibleMonths.forEach(function(monthKey) {
        maxValue = Math.max(
            maxValue,
            monthlyData[monthKey].income,
            monthlyData[monthKey].expense
        );
    });

    if (maxValue === 0) {
        maxValue = 1;
    }

    const left = 45;
    const right = 15;
    const top = 35;
    const bottom = 55;

    const graphWidth =
        width - left - right;

    const graphHeight =
        height - top - bottom;

    ctx.strokeStyle = "#bbbbbb";
    ctx.lineWidth = 1;

    ctx.beginPath();

    ctx.moveTo(
        left,
        top
    );

    ctx.lineTo(
        left,
        top + graphHeight
    );

    ctx.lineTo(
        left + graphWidth,
        top + graphHeight
    );

    ctx.stroke();

    const groupWidth =
        graphWidth /
        visibleMonths.length;

    const barWidth =
        Math.min(
            26,
            groupWidth * 0.3
        );

    visibleMonths.forEach(function(monthKey, index) {
        const income =
            monthlyData[monthKey].income;

        const expense =
            monthlyData[monthKey].expense;

        const incomeHeight =
            income /
            maxValue *
            graphHeight;

        const expenseHeight =
            expense /
            maxValue *
            graphHeight;

        const centerX =
            left +
            groupWidth *
            index +
            groupWidth / 2;

        ctx.fillStyle =
            "#4caf50";

        ctx.fillRect(
            centerX - barWidth - 2,
            top + graphHeight - incomeHeight,
            barWidth,
            incomeHeight
        );

        ctx.fillStyle =
            "#f44336";

        ctx.fillRect(
            centerX + 2,
            top + graphHeight - expenseHeight,
            barWidth,
            expenseHeight
        );

        const parts =
            monthKey.split("-");

        ctx.fillStyle =
            "#333333";

        ctx.font =
            "12px sans-serif";

        ctx.textAlign =
            "center";

        ctx.fillText(
            Number(parts[1]) + "月",
            centerX,
            top + graphHeight + 20
        );
    });

    ctx.font =
        "13px sans-serif";

    ctx.textAlign =
        "left";

    ctx.fillStyle =
        "#4caf50";

    ctx.fillRect(
        left,
        8,
        12,
        12
    );

    ctx.fillStyle =
        "#333333";

    ctx.fillText(
        "収入",
        left + 18,
        19
    );

    ctx.fillStyle =
        "#f44336";

    ctx.fillRect(
        left + 70,
        8,
        12,
        12
    );

    ctx.fillStyle =
        "#333333";

    ctx.fillText(
        "支出",
        left + 88,
        19
    );

    ctx.textAlign =
        "right";

    ctx.fillStyle =
        "#666666";

    ctx.font =
        "11px sans-serif";

    ctx.fillText(
        maxValue.toLocaleString() + "円",
        left - 4,
        top + 4
    );

    ctx.fillText(
        "0",
        left - 4,
        top + graphHeight
    );
}

async function showSelectedMonth() {
    const monthText =
        selectedYear +
        "-" +
        String(selectedMonth).padStart(
            2,
            "0"
        );

    document
        .getElementById("currentMonthLabel")
        .textContent =
        selectedYear +
        "年" +
        selectedMonth +
        "月";

    const list =
        document.getElementById("list");

    list.innerHTML = "";

    let monthIncome = 0;
    let monthExpense = 0;
    let recordCount = 0;

    const categoryTotals = {
        "食費": 0,
        "交通費": 0,
        "日用品": 0,
        "娯楽": 0,
        "その他": 0
    };

    records.forEach(function(record) {
        if (
            record.date &&
            record.date.startsWith(monthText)
        ) {
            showRecord(record);

            recordCount++;

            if (record.type === "income") {
                monthIncome +=
                    Number(record.amount);
            } else {
                monthExpense +=
                    Number(record.amount);

                let category =
                    record.category || "その他";

                if (
                    categoryTotals[category] ===
                    undefined
                ) {
                    category = "その他";
                }

                categoryTotals[category] +=
                    Number(record.amount);
            }
        }
    });

    fixedCosts.forEach(function(fixedCost) {
        monthExpense +=
            Number(fixedCost.amount);

        let category =
            fixedCost.category || "その他";

        if (
            categoryTotals[category] ===
            undefined
        ) {
            category = "その他";
        }

        categoryTotals[category] +=
            Number(fixedCost.amount);
    });

    if (recordCount === 0) {
        const li =
            document.createElement("li");

        li.textContent =
            "この月の記録はありません";

        list.appendChild(li);
    }

    const monthBalance =
        monthIncome -
        monthExpense;

    document
        .getElementById("incomeResult")
        .textContent =
        "収入合計：" +
        monthIncome.toLocaleString() +
        "円";

    document
        .getElementById("expenseResult")
        .textContent =
        "支出合計：" +
        monthExpense.toLocaleString() +
        "円";

    document
        .getElementById("balanceResult")
        .textContent =
        "残高：" +
        monthBalance.toLocaleString() +
        "円";

    const categorySummary =
        document.getElementById(
            "categorySummary"
        );

    categorySummary.innerHTML = "";

    for (const category in categoryTotals) {
        const p =
            document.createElement("p");

        p.textContent =
            category +
            "：" +
            categoryTotals[
                category
            ].toLocaleString() +
            "円";

        categorySummary.appendChild(p);
    }

    await showBudget(monthExpense);

    updateChart(categoryTotals);
}

document
    .getElementById("item")
    .addEventListener(
        "keydown",
        function(event) {
            if (event.key === "Enter") {
                document
                    .getElementById("amount")
                    .focus();
            }
        }
    );

document
    .getElementById("amount")
    .addEventListener(
        "keydown",
        function(event) {
            if (event.key === "Enter") {
                document
                    .getElementById("category")
                    .focus();
            }
        }
    );

document
    .getElementById("category")
    .addEventListener(
        "keydown",
        function(event) {
            if (event.key === "Enter") {
                document
                    .getElementById("type")
                    .focus();
            }
        }
    );

document
    .getElementById("type")
    .addEventListener(
        "keydown",
        function(event) {
            if (event.key === "Enter") {
                addMoney();
            }
        }
    );

document
    .getElementById("saveBudgetButton")
    .addEventListener(
        "click",
        saveBudget
    );

document
    .getElementById("addFixedCostButton")
    .addEventListener(
        "click",
        addFixedCost
    );

document
    .getElementById("prevMonthButton")
    .addEventListener(
        "click",
        async function() {
            selectedMonth--;

            if (selectedMonth === 0) {
                selectedMonth = 12;
                selectedYear--;
            }

            await showSelectedMonth();
        }
    );

document
    .getElementById("nextMonthButton")
    .addEventListener(
        "click",
        async function() {
            selectedMonth++;

            if (selectedMonth === 13) {
                selectedMonth = 1;
                selectedYear++;
            }

            await showSelectedMonth();
        }
    );

document
    .getElementById("showAllButton")
    .addEventListener(
        "click",
        function() {
            const list =
                document.getElementById("list");

            list.innerHTML = "";

            if (records.length === 0) {
                const li =
                    document.createElement("li");

                li.textContent =
                    "記録はありません";

                list.appendChild(li);

                return;
            }

            records.forEach(function(record) {
                showRecord(record);
            });
        }
    );

document
    .getElementById("loginButton")
    .addEventListener(
        "click",
        async function() {
            const email =
                document
                    .getElementById("loginEmail")
                    .value;

            const password =
                document
                    .getElementById("loginPassword")
                    .value;

            const { error } =
                await supabaseClient
                    .auth
                    .signInWithPassword({
                        email: email,
                        password: password
                    });

            const loginStatus =
                document.getElementById(
                    "loginStatus"
                );

            if (error) {
                loginStatus.textContent =
                    "ログインに失敗しました";

                return;
            }

            loginStatus.textContent = "";

            hideLoginArea();

            await loadFixedCosts();
            await loadSupabaseRecords();
        }
    );

window.addEventListener(
    "resize",
    function() {
        showSelectedMonth();
        updateMonthlyChart();
    }
);

window.onload =
    async function() {
        const today = new Date();

        const year =
            today.getFullYear();

        const month =
            String(
                today.getMonth() + 1
            ).padStart(
                2,
                "0"
            );

        const day =
            String(
                today.getDate()
            ).padStart(
                2,
                "0"
            );

        document
            .getElementById("date")
            .value =
            year +
            "-" +
            month +
            "-" +
            day;

        const {
            data: { session }
        } =
            await supabaseClient
                .auth
                .getSession();

        if (session) {
            hideLoginArea();

            await loadFixedCosts();
            await loadSupabaseRecords();
        } else {
            showLoginArea();

            showFixedCosts();

            await showSelectedMonth();

            updateMonthlyChart();
        }
    };