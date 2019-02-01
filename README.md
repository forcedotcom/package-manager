# brick-manager

## Org Data Sources
Org62
Blacktab (SB and Prod)
### LMA Org
#### Required Objects and Fields
##### sfLma__Package__c.DependencyTier__c
Type: Integer
Description: Identifies simple dependency tree.  Packages in Tier 1 are upgraded before Tier 2.  Tier 2 before Tier 3, and so on.

##### sfLma__Package_Version__c.Status__c
Type: Picklist
Values:
* Verified - GA-ready
* Pre-Release - SB-ready
* Preview - Preview package
* Limited - Limited release for select customers
