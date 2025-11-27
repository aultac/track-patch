#include <algorithm>
#include <cmath>
#include <cstdint>
#include <iostream>
#include <limits>
#include <map>
#include <queue>
#include <sstream>
#include <string>
#include <tuple>
#include <utility>
#include <vector>

namespace {

long long daysFromCivil(int y, unsigned m, unsigned d) {
    y -= m <= 2;
    const int era = (y >= 0 ? y : y - 399) / 400;
    const unsigned yoe = static_cast<unsigned>(y - era * 400);
    const unsigned doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
    const unsigned doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    return era * 146097 + static_cast<long long>(doe) - 719468;
}

int parseDayIndex(const std::string& day) {
    int y = 0, m = 0, d = 0;
    char dash;
    std::istringstream ss(day);
    ss >> y >> dash >> m >> dash >> d;
    if (!ss) return 0;
    return static_cast<int>(daysFromCivil(y, static_cast<unsigned>(m), static_cast<unsigned>(d)));
}

struct Order {
    std::string id;
    std::string day;
    long long capacitySeconds;
    int dayIndex;
};

struct Interval {
    std::string id;
    std::string day;
    long long start;
    long long durationSeconds;
    int dayIndex;
};

struct Edge {
    int to;
    long long cap;
    int rev;
};

class Dinic {
public:
    explicit Dinic(int n) : graph(n), level(n), ptr(n) {}

    void addEdge(int u, int v, long long cap) {
        Edge a{v, cap, static_cast<int>(graph[v].size())};
        Edge b{u, 0, static_cast<int>(graph[u].size())};
        graph[u].push_back(a);
        graph[v].push_back(b);
    }

    long long maxFlow(int s, int t) {
        long long flow = 0;
        while (bfs(s, t)) {
            std::fill(ptr.begin(), ptr.end(), 0);
            while (long long pushed = dfs(s, t, std::numeric_limits<long long>::max())) {
                flow += pushed;
            }
        }
        return flow;
    }

    const std::vector<std::vector<Edge>>& edges() const { return graph; }

private:
    std::vector<std::vector<Edge>> graph;
    std::vector<int> level;
    std::vector<int> ptr;

    bool bfs(int s, int t) {
        std::fill(level.begin(), level.end(), -1);
        std::queue<int> q;
        level[s] = 0;
        q.push(s);
        while (!q.empty()) {
            int v = q.front();
            q.pop();
            for (const auto& e : graph[v]) {
                if (e.cap <= 0 || level[e.to] != -1) continue;
                level[e.to] = level[v] + 1;
                q.push(e.to);
            }
        }
        return level[t] != -1;
    }

    long long dfs(int v, int t, long long pushed) {
        if (pushed == 0) return 0;
        if (v == t) return pushed;
        for (int& cid = ptr[v]; cid < static_cast<int>(graph[v].size()); ++cid) {
            Edge& e = graph[v][cid];
            if (level[e.to] != level[v] + 1 || e.cap <= 0) continue;
            long long tr = dfs(e.to, t, std::min(pushed, e.cap));
            if (tr == 0) continue;
            e.cap -= tr;
            graph[e.to][e.rev].cap += tr;
            return tr;
        }
        return 0;
    }
};

struct FlowLink {
    int intervalNode;
    int edgeIndex;
    int intervalIndex;
    int orderIndex;
    long long initialCap;
};

} // namespace

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    long long vehicleId = 0;
    if (!(std::cin >> vehicleId)) {
        std::cerr << "Failed to read vehicle id\n";
        return 1;
    }

    int orderCount = 0;
    std::cin >> orderCount;
    if (orderCount < 0) orderCount = 0;
    std::vector<Order> orders;
    orders.reserve(orderCount);
    for (int i = 0; i < orderCount; ++i) {
        Order o;
        std::cin >> o.id >> o.day >> o.capacitySeconds;
        o.dayIndex = parseDayIndex(o.day);
        if (o.capacitySeconds < 0) o.capacitySeconds = 0;
        orders.push_back(o);
    }

    int intervalCount = 0;
    std::cin >> intervalCount;
    if (intervalCount < 0) intervalCount = 0;
    std::vector<Interval> intervals;
    intervals.reserve(intervalCount);
    for (int i = 0; i < intervalCount; ++i) {
        Interval iv;
        std::cin >> iv.id >> iv.day >> iv.start >> iv.durationSeconds;
        iv.dayIndex = parseDayIndex(iv.day);
        if (iv.durationSeconds < 0) iv.durationSeconds = 0;
        intervals.push_back(iv);
    }

    const int source = 0;
    const int intervalOffset = 1;
    const int orderOffset = intervalOffset + intervalCount;
    const int sink = orderOffset + orderCount;
    Dinic dinic(sink + 1);
    std::vector<FlowLink> flowLinks;

    for (int i = 0; i < intervalCount; ++i) {
        const auto& interval = intervals[i];
        dinic.addEdge(source, intervalOffset + i, interval.durationSeconds);
    }

    for (int i = 0; i < intervalCount; ++i) {
        const auto& interval = intervals[i];
        for (int j = 0; j < orderCount; ++j) {
            const auto& order = orders[j];
            if (std::llabs(static_cast<long long>(interval.dayIndex) - order.dayIndex) > 1) {
                continue;
            }
            const long long capacity = interval.durationSeconds;
            int fromNode = intervalOffset + i;
            int toNode = orderOffset + j;
            int edgeIndex = static_cast<int>(dinic.edges()[fromNode].size());
            dinic.addEdge(fromNode, toNode, capacity);
            flowLinks.push_back({fromNode, edgeIndex, i, j, capacity});
        }
    }

    for (int j = 0; j < orderCount; ++j) {
        const auto& order = orders[j];
        dinic.addEdge(orderOffset + j, sink, order.capacitySeconds);
    }

    const long long totalFlow = dinic.maxFlow(source, sink);

    const auto& graph = dinic.edges();
    std::vector<std::tuple<std::string, std::string, long long>> assignments;
    assignments.reserve(flowLinks.size());
    for (const auto& link : flowLinks) {
        const Edge& edge = graph[link.intervalNode][link.edgeIndex];
        long long used = link.initialCap - edge.cap;
        if (used <= 0) continue;
        assignments.emplace_back(
            orders[link.orderIndex].id,
            intervals[link.intervalIndex].id,
            used
        );
    }

    std::cout << totalFlow << "\n";
    std::cout << assignments.size() << "\n";
    for (const auto& assign : assignments) {
        std::cout << std::get<0>(assign) << ' ' << std::get<1>(assign) << ' ' << std::get<2>(assign) << "\n";
    }
    std::cout.flush();
    return 0;
}

