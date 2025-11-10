require("dotenv").config();
const express = require("express");
const cors = require("cors");


const app = express();
const port = process.env.PORT || 5000;

// app.use(cors());
const corsOptions = {
  origin: "*", // Chỉ cho phép yêu cầu từ địa chỉ này
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

const userRoutes = require("./routes/userRoutes");
const notebookRoutes = require("./routes/notebookRoutes");
const vocabularyRoutes = require("./routes/vocabularyRoutes");
const usageRoutes = require("./routes/usageRoutes");
const mockTestRoutes = require("./routes/mockTestRoutes");
const mediaRoutes = require("./routes/mediaRoutes");
const testAttemptRoutes = require("./routes/testAttemptRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const tipRoutes = require("./routes/tipRoutes");
const examTypeRoutes = require("./routes/examTypeRoutes");
const examLevelRoutes = require("./routes/examLevelRoutes");
const examRoutes = require("./routes/examRoutes");
const badgeLevelRoutes = require("./routes/badgeLevelRoutes");
const achievementRoutes = require("./routes/achievementRoutes");
const questionTypeRoutes = require("./routes/questionTypeRoutes");
const attemptRoutes = require("./routes/attemptRoutes");
const postRoutes = require("./routes/postRoutes");
const commentRoutes = require("./routes/commentRoutes");
const communityRoutes = require("./routes/communityRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const communityRuleRoutes = require("./routes/communityRuleRoutes");
const moderationRoutes = require("./routes/moderationRoutes");
const userSubscriptionRoutes = require("./routes/userSubscriptionRoutes");
const refundRoutes = require("./routes/refundRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

app.use("/api", userRoutes);

app.use("/api", notebookRoutes);
app.use("/api", vocabularyRoutes);
app.use("/api", usageRoutes);
app.use("/api", mockTestRoutes);
app.use("/api", mediaRoutes);
app.use("/api", testAttemptRoutes);
app.use("/api", subscriptionRoutes);
app.use("/api", paymentRoutes);
app.use("/api", tipRoutes);
app.use("/api", examTypeRoutes);
app.use("/api", examLevelRoutes);
app.use("/api", examRoutes);
app.use("/api", badgeLevelRoutes);
app.use("/api", achievementRoutes);
app.use("/api", questionTypeRoutes);
app.use("/api", attemptRoutes);
app.use("/api", postRoutes);
app.use("/api", commentRoutes);
app.use("/api", communityRoutes);
app.use("/api", notificationRoutes);
app.use("/api", communityRuleRoutes);
app.use("/api", moderationRoutes);
app.use("/api", userSubscriptionRoutes);
app.use("/api", refundRoutes);
app.use("/api", dashboardRoutes);


app.listen(port, () => {
  console.log(`Server chạy tại http://localhost:${port}`);
});
