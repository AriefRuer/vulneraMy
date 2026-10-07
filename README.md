# VulneraMy:  Measuring Employment Stability in Malaysian Tourism

VulneraMy is an interactive analytics dashboard built for the DOSM Datathon 2026. Its
argument is easy to say and easy to miss. Malaysia's official headline number says
tourism supports about 3.5 million jobs. That number is true and stable throughout years, but it hides how unstable
tourism work really is. When you isolate only the jobs that genuinely depend on
visitors, four in five of them disappeared at the pandemic trough, while the headline
measure recorded a fall of about one job in twenty.

The dashboard follows that argument across seven pages and ends with a decision tool
rather than a stack of charts. It ships in two forms: a hosted web app on Vercel, and a
single offline HTML file that opens by double-click with no server and no internet.

| | |
|---|---|
| Live | [vulnera-my.vercel.app](https://vulnera-my.vercel.app) |
| Built with | React 19, TypeScript, D3 v7, Tailwind CSS, Zustand, Vite |
| Backend | Vercel serverless functions |
| AI assistant | "Booky", a per-chart chat with a deterministic offline fallback |
| Data | Official DOSM statistics only, bundled as one JSON file |
| Deliverable | Hosted app plus a self-contained offline HTML file |

## The core idea in plain words

Tourism is not one industry. It is a pattern of spending that runs through retail, food
and beverage, accommodation, transport and more. Because of that, the official
headline counts everyone employed in tourism industries, whether or not a visitor ever
pays their wage.

The Tourism Satellite Account, which is the accepted international method for measuring
tourism's economic weight, publishes something more precise beside the headline. For
each industry it gives the share of that industry's business that comes from tourism.
Multiply each industry's employment by its share, add the results together, and you get
the count of jobs that would genuinely vanish if tourism demand disappeared. This
project calls them **tourism-dependent jobs**. The formal name in the research report
is *tourism-attributable employment*.

Both numbers come from the same two published tables. The only difference is the
question you ask them. And the answers differ enormously.

| Term used here | Plain meaning |
|---|---|
| Headline employment | Everyone working in tourism industries, the published official count |
| Tourism-dependent jobs | Only the jobs actually sustained by visitor spending |
| Tourism ratio | The share of an industry's business that comes from tourism, published in the satellite account |
| Drawdown | The deepest fall from a peak to the later low, which is what workers actually experience |
| Coefficient of variation | A scale-free measure of how wildly a number swings year to year |
| Job density | Tourism-dependent jobs created per RM1 million spent in an industry |
| Absorption cap | The most an industry has ever taken in during a single normal year, used as a realistic spending limit |
| HHI (concentration index) | A 0 to 10,000 score of how much demand depends on one source market, where above 2,500 means high concentration |

## What the dashboard argues, page by page

Every page reads from one integrated data base and shares the same global filters for
year, state and sector, so a selection made on one page carries through the whole
argument and no two pages can disagree about a number.

| Page | The question it answers |
|---|---|
| Overview | How large is tourism employment, and how much of it truly depends on visitors? |
| Structural Analysis | Which industries gained and lost tourism-dependent jobs, and when? |
| Geographical Analysis | Which states carry the exposure, ranked by a reproducible vulnerability index? |
| Market and Flows | Where does demand actually come from, internationally and between states? |
| Simulation | Where should the next tourism budget go to create the most jobs? |
| Decent Work | Are these jobs any good once you look at what they pay? |
| SDG Alignment | What can honestly be claimed against the official UN tourism indicators? |

## The findings behind thosepages

Five findings carry the argument, and every number below is computed from the bundled
data and traceable to a named DOSM source table.

**The headline understates the shock fourteen-fold.** From the same two published
tables over the same decade, headline employment fell 5.5 percent between 2019 and
2021 while tourism-dependent jobs fell 79.1 percent, from 1.27 million to 266
thousand. Their swings differ five-fold. Any contingency plan sized against a 6 percent
shock is undersized against an 80 percent one.

**The aggregate recovery hides a redistribution.** Tourism-dependent employment
reached 104.2 percent of its 2019 level by 2024, which reads as a full recovery. By
industry it is not. Travel agencies lost more than a third of their tourism-dependent
jobs while culture and recreation gained a fifth, a spread of 57 percentage points.
For three industries the two measures move in opposite directions, so the headline
would rank the wrong winners and losers. A recovered total is a reason to re-target
support, not to withdraw it.

**Job density varies sixteen-fold.** A million ringgit spent in food and beverage
supports 11.6 tourism-dependent jobs. The same ringgit in fuel retail supports 0.7.
The employment consequence of tourism spending is set as much by where it goes as by
how large it is.

**Exposure is not the same as crowding.** The dashboard scores all 16 states on a
composite vulnerability index built from income instability, incomplete recovery,
external dependence and weak local capture, with weights stated openly and
stress-tested. The most vulnerable states are not the busiest. Crowding and fragility
need opposite instruments, and the quadrant view keeps them apart at a glance.

**Demand is dangerously concentrated.** On the international side, the concentration
index sat at the official high-concentration threshold in 2024, with one neighbouring
country supplying 46.9 percent of arrivals out of roughly 195 source markets.
Domestically, a quarter of all trips never leave the traveller's home state, and East
Malaysia is largely a separate market. Campaigns aimed at the wrong origin will not
move demand.

**Every tourism-carrying industry pays below the national median.** Weighted by
tourism-dependent employment, median pay in these industries averages RM1,985 against
a national RM2,793. The largest employer, accommodation and food and beverage
together, never exceeded 72 percent of the national median at any point between 2010
and 2024. That is a fifteen-year structural position, not a pandemic effect, and it
qualifies the allocation result rather than overturning it.

## The simulation is a real optimisation model

The Simulation page runs a budget-allocation linear programme live in the browser. It
maximises tourism-dependent jobs created, subject to a total budget and a per-industry
absorption cap derived from each industry's own best single year of spending growth
between 2015 and 2019.

Because the objective is linear and the only constraints are the budget and those
per-industry bounds, the optimum is a greedy fill in descending order of job density.
The dashboard therefore re-solves the model for any budget on a slider, and it
reproduces the independently solved benchmark exactly at RM5 billion. Allocating by
employment yield rather than by current spending shares creates 17.9 thousand more
tourism-dependent jobs, a 55.7 percent uplift, and cuts the cost per job from RM155,231
to RM99,700. The page states its assumptions beside the chart: the model compares
allocation logics, it is not a budget instruction.

## The AI assistant, Booky

Every chart carries an assistant badge. Click it and a chat opens, scoped to that one
visualisation, so a reader who does not know what a concentration index measures can
ask in plain language and get an answer grounded in the actual numbers.

The design is deliberately constrained. A question travels to a serverless endpoint
that caps input length, rate-limits each address, and validates the chart identifier
against a fixed server registry. That registry is the authorisation boundary, which
means a browser cannot request data from outside the dashboard. The facts for the
chart are computed by ordinary code from the bundled data, and only those fact strings,
never raw data, reach the language model. The model runs under a fixed system prompt
that treats its context as data rather than instructions, and its output is rendered as
escaped plain text.

If no model is configured, or the call fails or runs out of time, the same computed
facts are returned directly. Every failure maps to a calm sentence, so a reader never
sees a raw error code. No credential exists anywhere in the client bundle.

## Offline first

The datathon brief requires the dashboard to work without external dependencies, so
one codebase produces two artifacts through build flags. The hosted build on Vercel
tries the assistant's live endpoint and falls back gracefully. The offline build sets
`VITE_OFFLINE_ONLY=true` and produces a single self-contained HTML file with all code,
styles, images and data inlined. It makes no data request, removes the network path
entirely, and answers from the same deterministic fact functions as the server, so the
online and offline assistants agree across all eleven chart datasets. Its only
external reference is a web font, which falls back to system fonts without a
connection.

## Data provenance

All data is official Malaysian statistics from six source families, harmonised into a
single integrated base of 18 tables. That base is the only data artifact the dashboard
reads, so no hidden transformation sits between the published statistics and a
rendered chart.

| Source | Used for |
|---|---|
| Tourism Satellite Account | Expenditure, employment by industry, tourism ratios, Tourism Direct GDP, 2015 to 2024 |
| Domestic Tourism Survey | State visitors, receipts, trips, and the origin-destination flow matrix |
| International arrivals | Monthly arrivals by country of residence, 58 months from January 2020 |
| Salaries and Wages Survey | Median monthly salary by industry section, 2010 to 2024 |
| Population estimates | Visitors and nights per resident |
| SDG indicator series | Indicators 8.9.1 and 12.b.1 |

No external, scraped, proprietary or synthetic data enters the pipeline.

## Validation and honest limits

The integrated base passes 32 automated checks covering satellite-account identities,
the partition of national totals across states, units and ranges, and missing or
infinite values. The in-browser optimisation is reconciled against the solved
benchmark. A final manual review against the source code caught two defects the checks
missed, a drawdown computed without regard to time order and an arrivals series
aggregated across entry points, and every figure in the report is recomputed from the
shipped data file.

The project is equally explicit about what it declined to do. Three predictive models
were tested, a regularised panel model for monthly arrivals, a random forest for state
receipts and a ridge model for recovery, and all three lost to trivial baselines under
proper validation. None was shipped. A clustering model found no separable groups
either, which is why states are scored on a continuous index rather than sorted into
types. The report documents these rejections as a model selection log, because a
seasonal-naive predictor beating a fitted model is itself evidence for the volatility
thesis. The study also makes no environmental sustainability claim, and explains that
the official accounts needed to support one are not yet broken down to tourism.

