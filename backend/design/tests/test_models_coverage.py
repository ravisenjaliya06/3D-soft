# Python imports
from unittest.mock import patch

# Django imports
from django.db import IntegrityError

# External imports
import pytest

# App imports
from design.models import Design, NestingFile, NestingSheet
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase


@pytest.mark.django_db
class DesignModelsCoverageTestCase(APIBaseTestCase):
    databases = {DEFAULT_DATABASE}

    def test_design_str(self: "DesignModelsCoverageTestCase") -> None:
        self.assertEqual(str(self.design), self.design.design_name)

    def test_nesting_sheet_str(self: "DesignModelsCoverageTestCase") -> None:
        sheet = NestingSheet.objects.create(
            design=self.design, sheet_number=1, width=2440, height=1220
        )
        self.assertEqual(str(sheet), f"Sheet 1 - {self.design.design_name}")

    def test_nesting_file_str(self: "DesignModelsCoverageTestCase") -> None:
        file_obj = NestingFile.objects.create(
            design=self.design,
            file_type="svg",
            file_path="./test.svg",
            file_name="test.svg",
        )
        self.assertEqual(str(file_obj), "svg - test.svg")

    def test_design_save_integrity_error_loop(
        self: "DesignModelsCoverageTestCase",
    ) -> None:
        """Test the retry loop in Design.save for project_code collisions."""
        with patch("design.models.models.Model.save") as mock_save:
            mock_save.side_effect = IntegrityError("Duplicate")

            with self.assertRaises(IntegrityError) as cm:
                new_design = Design(
                    organization=self.organization,
                    created_by=self.user,
                    design_name="Fail Design",
                )
                new_design.save()

            self.assertEqual(
                str(cm.exception), "Could not generate unique project code"
            )
            # Verify it tried 10 times
            self.assertEqual(mock_save.call_count, 10)
