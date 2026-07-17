import re

# Fix Controls.jsx
with open("src/components/Controls.jsx", "r") as f:
    controls = f.read()
controls = controls.replace("onClick={hireWorker}", "onClick={() => hireWorker()}")
controls = controls.replace("onClick={fireWorker}", "onClick={() => fireWorker()}") # Fix fireWorker as well just in case
with open("src/components/Controls.jsx", "w") as f:
    f.write(controls)

# Fix PortfolioBoard.jsx
with open("src/components/PortfolioBoard.jsx", "r") as f:
    portfolio = f.read()

old_portfolio = """  const traitCounts = (employees || []).reduce((counts, employee) => {
    counts[employee.trait] = (counts[employee.trait] || 0) + 1;
    return counts;
  }, {});
  const topTraits = Object.entries(traitCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);"""

new_portfolio = """  const topTraits = React.useMemo(() => {
    const traitCounts = (employees || []).reduce((counts, employee) => {
      counts[employee.trait] = (counts[employee.trait] || 0) + 1;
      return counts;
    }, {});
    return Object.entries(traitCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [employees]);"""
portfolio = portfolio.replace(old_portfolio, new_portfolio)
with open("src/components/PortfolioBoard.jsx", "w") as f:
    f.write(portfolio)

# Fix KpiBoard.jsx
with open("src/components/KpiBoard.jsx", "r") as f:
    kpi = f.read()

old_kpi = """  const activeEventLabel = activeEvents.length
    ? activeEvents.map((event) => event.type).join(', ')
    : 'None';
  const inventoryLabel = inventory.length ? inventory.join(', ') : 'Empty';"""

new_kpi = """  const activeEventLabel = React.useMemo(() => {
    return activeEvents?.length
      ? activeEvents.map((event) => event.type).join(', ')
      : 'None';
  }, [activeEvents]);

  const inventoryLabel = React.useMemo(() => {
    return inventory?.length ? inventory.join(', ') : 'Empty';
  }, [inventory]);"""
kpi = kpi.replace(old_kpi, new_kpi)
with open("src/components/KpiBoard.jsx", "w") as f:
    f.write(kpi)

print("Done replacing.")
