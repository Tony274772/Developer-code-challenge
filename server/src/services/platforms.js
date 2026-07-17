const axios = require("axios");
const cheerio = require("cheerio");

const request = axios.create({
  timeout: 9000,
  headers: {
    "User-Agent": "coding-leaderboard/1.0"
  }
});

async function fetchLeetCode(username) {
  const query = `
    query userSessionProgress($username: String!) {
      matchedUser(username: $username) {
        submitStats {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
    }
  `;

  const { data } = await request.post("https://leetcode.com/graphql", {
    query,
    variables: { username }
  });

  const stats = data?.data?.matchedUser?.submitStats?.acSubmissionNum || [];
  const total = stats.find((item) => item.difficulty === "All")?.count || 0;
  return {
    solved: total,
    profileUrl: `https://leetcode.com/${username}/`,
    status: total > 0 ? "synced" : "synced-empty"
  };
}

async function fetchCodeChef(username) {
  const profileUrl = `https://www.codechef.com/users/${username}`;
  const { data } = await request.get(profileUrl);
  const $ = cheerio.load(data);
  const solvedText = $(".rating-data-section.problems-solved h3").first().text();
  const match = solvedText.match(/Total Problems Solved:\s*(\d+)/i);

  return {
    solved: match ? Number(match[1]) : 0,
    profileUrl,
    status: match ? "synced" : "needs-review"
  };
}

async function fetchCodeforces(username) {
  const { data } = await request.get("https://codeforces.com/api/user.status", {
    params: { handle: username, from: 1, count: 10000 }
  });

  const accepted = new Set();
  for (const submission of data.result || []) {
    if (submission.verdict === "OK" && submission.problem) {
      accepted.add(`${submission.problem.contestId}-${submission.problem.index}`);
    }
  }

  return {
    solved: accepted.size,
    profileUrl: `https://codeforces.com/profile/${username}`,
    status: "synced"
  };
}

async function fetchUnsupported(platform, username) {
  return {
    solved: 0,
    profileUrl: platform === "hackerrank" ? `https://www.hackerrank.com/profile/${username}` : "",
    status: "manual-update"
  };
}

async function fetchPlatformStats(platform, username) {
  if (!username) return { solved: 0, profileUrl: "", status: "missing-username" };

  try {
    if (platform === "leetcode") return await fetchLeetCode(username);
    if (platform === "codechef") return await fetchCodeChef(username);
    if (platform === "codeforces") return await fetchCodeforces(username);
    return await fetchUnsupported(platform, username);
  } catch (error) {
    return {
      solved: 0,
      profileUrl: "",
      status: `sync-failed: ${error.response?.status || error.code || "error"}`
    };
  }
}

module.exports = { fetchPlatformStats };
