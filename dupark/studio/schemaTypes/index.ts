import {SchemaTypeDefinition} from 'sanity'
import project from './project'
import category from './category'
import siteSettings from './siteSettings'
import aboutPage from './aboutPage'

export const schemaTypes: SchemaTypeDefinition[] = [project, category, siteSettings, aboutPage]