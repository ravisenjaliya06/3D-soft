from umaboy.models import Organization, User
from material.models import FinishesLibrary, Company, Material
from django.db import transaction
from copy import deepcopy

def duplicate_model(user: User, organization: Organization):
    """
    Duplicate all FinishesLibrary, Company, and Properties objects
    where organization is None, assign them to target organization,
    and optionally assign user permissions.
    """
    with transaction.atomic():
        # --- Duplicate FinishesLibrary ---
        finishes = FinishesLibrary.objects.filter(organization__isnull=True)
        finish_copies = []
        for f in finishes:
            f_copy = deepcopy(f)  # create a new copy
            f_copy.pk = None 
            f_copy.organization = organization  # assign organization instance
            finish_copies.append(f_copy)
        FinishesLibrary.objects.bulk_create(finish_copies)

        # --- Duplicate Company ---
        companies = Company.objects.filter(organization__isnull=True)
        company_copies = []
        for c in companies:
            c_copy = deepcopy(c)  # create a new copy
            c_copy.pk = None 
            c_copy.organization = organization
            company_copies.append(c_copy)
        Company.objects.bulk_create(company_copies)

        material = Material.objects.filter(organization__isnull=True)
        material_copies = []
        for m in material:
            m_copy = deepcopy(m)  # create a new copy
            m_copy.pk = None 
            m_copy.organization = organization
            material_copies.append(c_copy)
        Material.objects.bulk_create(material_copies)

        # # --- Duplicate Properties ---
        # properties = Properties.objects.filter(organization__isnull=True)
        # property_copies = []
        # for p in properties:
        #     p_copy = deepcopy(p)  # create a new copy
        #     p_copy.pk = None 
        #     p_copy.organization = organization
        #     property_copies.append(p_copy)
        # Properties.objects.bulk_create(property_copies)

        # --- Assign user permission (example) ---
        # Assuming your User model has a ManyToMany to Organization called "organizations"
        user.organizations.add(organization)
        user.save()


