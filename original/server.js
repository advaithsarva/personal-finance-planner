// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const axios = require('axios');

// const app = express();
// app.use(express.json());
// app.use(cors());

// const GROQ_API_KEY = process.env.GROQ_API_KEY;

// // Endpoint to get financial advice based on user selection
// app.post('/api/finance', async (req, res) => {
//     try {
//         const { amount, type } = req.body;
//         console.log("Request received with amount:", amount, "and type:", type);

//         let prompt = "";

//         if (type === "salary") {
//             prompt = `
//             Act as a financial advisor providing advice on managing salary effectively. The user has entered their salary amount:

//             - Salary Amount: ${amount} INR

//             Provide insights on how the user can manage their salary effectively. Include the following advice:

//             1. Suggest a budgeting strategy to allocate their salary towards essential expenses, savings, and investments.
//             2. Recommend setting aside a portion of their salary for an emergency fund.
//             3. Advise on tax planning and potential deductions to maximize take-home pay.
//             4. Provide tips on negotiating salary increases or seeking additional income streams.

//             Ensure the advice is practical, easy to understand, and tailored to help the user make informed financial decisions.
//             `;
//         } else if (type === "savings") {
//             prompt = `
//             Act as a financial advisor providing advice on optimizing savings. The user has entered their savings amount:

//             - Savings Amount: ${amount} INR

//             Offer strategies to grow and optimize the user's savings. Include the following advice:

//             1. Recommend high-yield savings accounts or fixed deposits for secure growth.
//             2. Suggest diversifying savings across different financial instruments like bonds or liquid funds.
//             3. Advise on setting savings goals for short-term and long-term needs.
//             4. Provide tips on automating savings to ensure consistency.

//             Ensure the advice is practical, easy to understand, and tailored to help the user make informed financial decisions.
//             `;
//         } else if (type === "investment") {
//             prompt = `
//             Act as a financial advisor providing investment advice. The user has entered their investment amount:

//             - Investment Amount: ${amount} INR

//             Guide the user on investment opportunities to grow their wealth. Include the following advice:

//             1. Suggest a diversified investment portfolio including stocks, mutual funds, ETFs, and real estate.
//             2. Recommend investments tailored to the user's risk tolerance and financial goals.
//             3. Provide insights on market trends and potential investment opportunities.
//             4. Advise on the benefits of long-term investing and the power of compounding.

//             Ensure the advice is practical, easy to understand, and tailored to help the user make informed financial decisions.
//             `;
//         } else {
//             return res.status(400).json({ error: "Invalid type specified" });
//         }

//         const response = await axios.post(
//             'https://api.groq.com/openai/v1/chat/completions',
//             {
//                 model: "llama-3.3-70b-versatile",
//                 messages: [{ role: "user", content: prompt }],
//                 max_tokens: 500, // Increase if needed for more detailed responses
//             },
//             { headers: { Authorization: `Bearer ${GROQ_API_KEY}` } }
//         );

//         const suggestions = response.data.choices[0].message.content;
//         res.json({ suggestions });
//     } catch (error) {
//         console.error("Error during API call:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// });

// app.listen(5000, () => console.log("Server running on port 5000"));
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error("GROQ_API_KEY is not defined in the environment variables.");
  process.exit(1);
}

const generatePrompt = (type, amount) => {
    switch (type) {
        case "investment":
            return `
                You are an expert financial advisor. Provide detailed investment strategies for a user with:
                - Investment Amount: ${amount} INR
                - Investment Type: High-risk, low-risk, diversified options.

                Provide recommendations for:
                1. Short-Term Investments (1-3 years)
                2. Medium-Term Investments (3-7 years)
                3. Long-Term Investments (7+ years)
                4. Diversification Strategy

                Give specific investment product names and percentage allocations.
            `;
        case "salary":
            return `
                You are a financial planner. Provide insights on salary growth and budgeting based on:
                - Current Salary: ${amount} INR
                - Expected Annual Increase: Predict growth over 5 years.

                Provide insights on:
                1. Expected salary increments
                2. How to allocate salary for savings, investments, and expenses
                3. Long-term financial planning for stability
            `;
        case "savings":
            return `
                You are a financial consultant. Suggest the best savings strategies for a user with:
                - Savings Amount: ${amount} INR

                Provide recommendations for:
                1. High-yield savings accounts
                2. Fixed Deposits and Recurring Deposits
                3. Low-risk investment options for savings growth
                4. Best methods to maximize savings returns
            `;
        default:
            return "Provide financial guidance.";
    }
};

app.post('/api/finance', async (req, res) => {
    try {
        const { amount, type } = req.body;
        console.log("Request received with data:", { amount, type });

        if (!amount || !type) {
            console.error("Missing amount or type in request body.");
            return res.status(400).json({ error: "Amount and type are required" });
        }

        const prompt = generatePrompt(type, amount);
        console.log("Generated prompt:", prompt);

        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 200,
            },
            { headers: { Authorization: `Bearer ${GROQ_API_KEY}` } }
        );

        const suggestions = response.data.choices[0].message.content.split('\n').filter(Boolean);
        console.log("Suggestions received:", suggestions);
        res.json({ suggestions });
    } catch (error) {
        console.error("Error during API call:", error.message || error);
        res.status(500).json({ error: "Groq API Error" });
    }
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});
