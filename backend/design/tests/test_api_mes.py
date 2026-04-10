# Python imports
from datetime import date

# External imports
import pytest
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

# App imports
from design.models import Design
from mes_portal.models import WorkOrder
from mes_portal.views import WorkOrderViewSet
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase
from umaboy.models import Organization


@pytest.mark.django_db
class MesWorkOrderAPITestCase(APIBaseTestCase):
    databases = {DEFAULT_DATABASE}

    def test_mes_workorder_str_returns_name(self: "MesWorkOrderAPITestCase") -> None:
        wo = WorkOrder.objects.create(
            design=self.design,
            name="WO-1",
            client_name="Client A",
            description="D",
            delivery_date=date.today(),
        )
        self.assertEqual(str(wo), "WO-1")

    def test_mes_workorder_viewset_get_queryset_filters_by_selected_org(
        self: "MesWorkOrderAPITestCase",
    ) -> None:
        other_org = Organization.objects.create(
            name="OtherOrg", display_name="OtherOrg"
        )
        other_design = Design.objects.create(
            organization=other_org,
            created_by=self.user,
            design_name="other-design",
        )
        WorkOrder.objects.create(
            design=self.design,
            name="WO-keep",
            client_name="A",
            description="x",
            delivery_date=date.today(),
        )
        WorkOrder.objects.create(
            design=other_design,
            name="WO-drop",
            client_name="B",
            description="y",
            delivery_date=date.today(),
        )
        view = WorkOrderViewSet()
        req = Request(APIRequestFactory().get("/v1/mes_portal/work-order/"))
        req.user = self.user
        view.request = req
        qs = view.get_queryset()
        self.assertTrue(qs.filter(name="WO-keep").exists())
        self.assertFalse(qs.filter(name="WO-drop").exists())
