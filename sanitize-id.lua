-- Sanitize identifiers and in-document link targets for the typst PDF engine:
-- - em-dash in headings becomes '--' which is invalid in typst label
--   identifiers, so collapse hyphen runs to a single '-';
-- - typst label identifiers cannot start with a digit, and numbered headings
--   slug to '3-1-...', so prefix every id with 'sec-'.
local function sanitize(s)
  return "sec-" .. s:gsub("%-%-+", "-")
end

function Header(el)
  if el.identifier then
    el.identifier = sanitize(el.identifier)
  end
  return el
end

function Link(el)
  if el.target and el.target:match("^#") then
    el.target = "#" .. sanitize(el.target:sub(2))
  end
  return el
end
