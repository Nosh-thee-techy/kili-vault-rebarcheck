"""Allow `python -m rebarcheck` to run the analyzer CLI."""

from .analyze import main

raise SystemExit(main())
